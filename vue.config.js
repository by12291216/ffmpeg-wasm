const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const express = require("express");

const BASE_URL = process.env.NODE_ENV === "production" ? "./public/" : "./";

module.exports = defineConfig({
  publicPath: "./",
  transpileDependencies: true,
  configureWebpack: {
    devServer: {
      port: "8080",
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      proxy: {
        // 配置跨域
        "/thcloud": {
          target: "http://192.168.45.217:7003/thcloud",
          changeOrigin: true,
          pathRewrite: { '^/thcloud': '/' } // 相当于用'/api'代替target里面的地址，调接口时用/api代替
        },
      },
      onBeforeSetupMiddleware: ({ app }) => {
        app.use(
          "/node_modules/",
          express.static(path.resolve(__dirname, "node_modules"))
        );
        app.use((_, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  },
});
