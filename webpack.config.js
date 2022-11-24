const path = require("path");

module.exports = {
  mode: "none",
  entry: {
    "turbo.min": {
      import: "./src/index.js",
      library: {
        type: "commonjs-module",
      },
    },
  },
  output: {
    libraryExport: "default",
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/, //不转换的文件
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
    ],
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    minimize: true,
  },
};

// 打包后在turbo.min.js前加入：
// import storage from "@system.storage";import fetch from "@system.fetch";import device from "@system.device";import network from "@system.network";import router from "@system.router";import app from "@system.app";
