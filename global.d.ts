// global.d.ts

// Allow importing CSS files (both as modules and for side-effects)
declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}
