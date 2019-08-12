import {
  addAttributesToSpan,
  AggregationType,
  globalStats,
  MeasureUnit,
  SpanKind,
  tracer,
} from '@neo-one/client-switch';
import { Logger } from '@neo-one/logger';
import { Labels, labelsToTags } from '@neo-one/utils';
import { Context } from 'koa';

const labelNames: readonly string[] = [Labels.HTTP_PATH, Labels.HTTP_STATUS_CODE, Labels.HTTP_METHOD];

const requestSec = globalStats.createMeasureInt64('requests/duration', MeasureUnit.SEC);
const requestErrors = globalStats.createMeasureInt64('requests/failures', MeasureUnit.UNIT);

const REQUESTS_HISTOGRAM = globalStats.createView(
  'http_server_request_duration_seconds',
  requestSec,
  AggregationType.DISTRIBUTION,
  labelsToTags(labelNames),
  'distribution of the requests duration',
  [1, 2, 5, 7.5, 10, 12.5, 15, 17.5, 20],
);
globalStats.registerView(REQUESTS_HISTOGRAM);

const REQUEST_ERRORS_COUNTER = globalStats.createView(
  'http_server_request_failures_total',
  requestErrors,
  AggregationType.COUNT,
  labelsToTags(labelNames),
  'total request failures',
);
globalStats.registerView(REQUEST_ERRORS_COUNTER);

const getContextLabels = (ctx: Context) => {
  const spanLabels = {
    [Labels.HTTP_METHOD]: ctx.request.method,
    [Labels.SPAN_KIND]: 'server',
    [Labels.HTTP_REQUEST_PROTOCOL]: ctx.request.protocol,
  };

  return {
    spanLabels,
    logLabels: {
      [Labels.HTTP_HEADERS]: JSON.stringify(ctx.request.headers),
      [Labels.HTTP_URL]: ctx.request.originalUrl,
      [Labels.HTTP_FULLPATH]: ctx.request.path,
      [Labels.HTTP_REQUEST_QUERY]: ctx.request.querystring,
      [Labels.PEER_ADDRESS]: ctx.request.ip,
      [Labels.PEER_PORT]: ctx.request.socket.remotePort,
      [Labels.HTTP_REQUEST_SIZE]: ctx.request.length,
      ...spanLabels,
    },
  };
};

export const context = (logger: Logger) => async (ctx: Context, next: () => Promise<void>) => {
  const spanExtract = tracer.propagation.extract({ getHeader: (name: string) => ctx.headers[name] });
  const spanContext = spanExtract !== null ? spanExtract : undefined;
  const { spanLabels, logLabels } = getContextLabels(ctx);
  const childLogger = logger.child({ labels: logLabels, service: 'http-server' });
  ctx.state.logger = childLogger;
  await tracer.startRootSpan({ spanContext, name: 'http_server_request', kind: SpanKind.SERVER }, async (span) => {
    addAttributesToSpan(span, spanLabels);
    try {
      const startTime = Date.now();
      try {
        await next();
      } finally {
        addAttributesToSpan(span, {
          [Labels.HTTP_STATUS_CODE]: ctx.status,
          [Labels.HTTP_PATH]: 'unknown',
        });
        // tslint:disable-next-line no-any
        const { router, routerName } = ctx as any;
        if (router != undefined && routerName != undefined) {
          const layer = router.route(routerName);
          if (layer) {
            span.addAttribute(Labels.HTTP_PATH, layer.path);
          }
        }
      }
      childLogger.debug({ title: 'http_server_request' });
      globalStats.record([
        {
          measure: requestSec,
          value: Date.now() - startTime,
        },
      ]);
    } catch (error) {
      childLogger.error({ title: 'http_server_request', error });
      globalStats.record([
        {
          measure: requestErrors,
          value: 1,
        },
      ]);

      throw error;
    } finally {
      span.end();
    }
  });
};

export const onError = (logger: Logger) => (error: Error, ctx?: Context) => {
  const labels = ctx !== undefined ? getContextLabels(ctx).logLabels : {};
  logger.error(
    { title: 'http_server_request_uncaught_error', error: error.message, ...labels },
    'Unexpected uncaught request error.',
  );
};
