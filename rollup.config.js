import buble from "rollup-plugin-buble";
import { uglify } from "rollup-plugin-uglify";

export default {
  input: "src/syncdom.js",
  output: {
    name: "syncDom",
    file: "dist/syncdom.js",
    format: "umd"
  },
  plugins: [buble(), uglify()]
};
