const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    entry: {
        app: path.resolve(__dirname, "src", "index.js"),
        windowed: path.resolve(__dirname, "src", "index-window.js"),
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: "TodoMVC: React",
            chunks: ["app"],
            template: path.resolve(__dirname, "public", "index.html"),
        }),
        new HtmlWebpackPlugin({
            title: "TodoMVC: React-Window",
            inject: false,
            template: path.resolve(__dirname, "public", "window", "index.html"),
            filename: "index-window.html",
            script: "windowed.bundle.js",
        }),
        new HtmlWebpackPlugin({
            title: "TodoMVC: React-Window inner window",
            inject: false,
            template: path.resolve(__dirname, "public", "window", "todo.html"),
            filename: "todo.html",
            styles: "windowed.css",
        }),
    ],
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
    resolve: {
        extensions: [".js", ".jsx"],
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ["@babel/preset-env", { targets: "defaults" }],
                            ["@babel/preset-react", { runtime: "automatic" }],
                        ],
                    },
                },
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: "asset/resource",
            },
        ],
    },
};
