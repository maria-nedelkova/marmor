declare module "*.css";

/** Bun's bundler turns an image import into a URL string (and copies the file
 * into the build output with a hashed name). Declared so importing one is
 * typed as the `src` it actually is, rather than `any`. */
declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.jpg" {
  const url: string;
  export default url;
}
