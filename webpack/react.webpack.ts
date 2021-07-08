import * as path from "path";
const HtmlWebpackPlugin = require("html-webpack-plugin");

const rootPath = path.resolve(__dirname, "..");

const config = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    mainFields: ["main", "module", "browser"],
  },
  entry: {
    mainWindow: path.resolve(rootPath, "src/renderer", "index.tsx"),
    worker: path.resolve(rootPath, "src/worker", "workerWindow.tsx")
  }, 
  target: "electron-renderer",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
  devServer: {
    static: path.join(rootPath, "dist/renderer"),
    devMiddleware: {
      publicPath: "/",
    },
    port: 4000,
    historyApiFallback: true,
    compress: true,
  },
  output: {
    path: path.resolve(rootPath, "dist/renderer"),
    filename: "js/[name].js",
    publicPath: "./",
  },
  plugins: [new HtmlWebpackPlugin({
              title: "Vaccine Booking App",
              chunks: ['mainWindow']
            }),
            new HtmlWebpackPlugin({
              title: "Vaccine Booking App Worker",
              filename: "worker.html",
              chunks: ['worker']
            })],
};

export default config;
