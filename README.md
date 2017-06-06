# Haxe Loader for Webpack

This loader allows you to load hxml files directly into webpack, and included the Haxe-compiled Javascript result directly in your bundle.

There are several reasons for doing this:

- If you are going to use NPM libraries as externs, you need to compile with Webpack or Browserify etc. Having the two compile steps (Haxe and Webpack) makes it easier.
- There's a good chance you'll want webpack anyway for compiling CSS (or SASS or LESS), managing static assets, or minifying the resulting JS bundle.
- When Webpack is set up right, it has a nice development experience, with things like:
    - `webpack --watch` to watch any changes you make to a file and recompile.
    - `webpack-dev-server` to hot-reload a page based on changes you make.

With this loader, you are able to:

- Use a `hxml` file as the entry point for your build.
- Change any `*.hx` source file, and have haxe re-compile, webpack re-bundle, and the browser refresh automatically as soon as you save.

Currently the loader only supports HXML files which export exactly one Javascript file.  Other targets may be supported in future.

### Example webpack configuration

```js
module.exports = {
    entry: './client.hxml',
    output: {
        path: __dirname + "/www/assets",
        filename: 'react-test.bundle.js'
    },
    module: {
        rules: [
            // Have a rule that explains hxml files should use `haxe-loader`.
            {
                test: /\.hxml$/,
                loader: 'haxe-loader',
            }
        ]
    },
};
```

You can also add some convenience scripts to your `package.json`:

    "scripts": {
        "webpack": "node node_modules/webpack/bin/webpack.js",
        "watch": "node node_modules/webpack/bin/webpack.js --watch"
    },

Now you can run:

    - `yarn run webpack` - Use webpack to compile your entry point (or entry points)
    - `yarn run watch` - Watch for changes and recompile automatically

Please note `npm run ...` also works just fine.

### Dev server setup

You can use [webpack-dev-server](https://webpack.js.org/configuration/dev-server/) to watch changes and auto-refresh a page after Haxe has compiled any changes.

Install `webpack-dev-server`

    yarn add --dev webpack-dev-server    # Or you can `npm install --dev webpack-dev-server`

Add some configuration to your `webpack.config.js`:

    devServer: {
        contentBase: "./www",   // Your web root is in the "www" folder
        publicPath: "/assets/", // The JS or assets webpack is building are in "www/assets"
        overlay: true,          // Display compilation errors in the browser
    },

Add a script to your `package.json`:

    "scripts": {
        "start": "webpack-dev-server --open",
    },

Run `yarn run start` to start the development server.

If you have a backend you want to use, for example Nekotools running on `http://localhost:2000`, webpack-dev-server comes with a proxy:

    devServer: {
        contentBase: "./www",
        overlay: true,
        proxy: {
            "/": {
                changeOrigin: true,
                target: "http://localhost:2000"
            }
        },
        publicPath: "/js/"
    },

### Copyright and License

Created by Jason O'Neil in 2017.  Released under the MIT license.
