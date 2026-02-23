declare module 'dom-to-image-more' {
  interface Options {
    scale?: number;
    width?: number;
    height?: number;
    bgcolor?: string;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
  }
  const domToImage: {
    toPng(node: HTMLElement, options?: Options): Promise<string>;
    toJpeg(node: HTMLElement, options?: Options): Promise<string>;
    toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
    toSvg(node: HTMLElement, options?: Options): Promise<string>;
  };
  export default domToImage;
}
