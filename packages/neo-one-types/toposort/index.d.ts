declare module 'toposort' {
  export default function toposort(graph: ReadonlyArray<[string, string]>): ReadonlyArray<string>;
}
