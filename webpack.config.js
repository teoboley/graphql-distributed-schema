const webpack = require("webpack");
const browserify = require("browserify");
const path = require("path");
const fs = require("fs");
const dts = require("dts-bundle");

const nodeExternals = require("webpack-node-externals");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WebpackOnBuildPlugin = require('on-build-webpack');

const config = {
	srcDir: "src",
	buildDir: "dist"
};

const webpackOpts = {
	entry: './src/index.ts',
	target: 'node',
	output: {
		filename: libPath('index.js'),
		libraryTarget: "commonjs2"
	},
	resolve: {
		extensions: ['.ts', '.js'],
		modules: [
			'node_modules',
			'src',
		]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: [
					{
						loader: "awesome-typescript-loader",
						options: {
							useBabel: true
						}
					}

				]
			}
		]
	},
	externals: [nodeExternals()],
	plugins: [
		new CleanWebpackPlugin([libPath()]),
		new webpack.optimize.UglifyJsPlugin(),
		new WebpackOnBuildPlugin((stats) => {
			createBrowserVersion(webpackOpts.output.filename, () => {
				// Invokes dts bundling
				console.log("Bundling d.ts files ...");
				dts.bundle(bundleOpts);
				console.log("d.ts files bundled");
			});
		})
	]
};

const bundleOpts = {
	// name of module like in package.json
	name: 'modular-graphql',

	// path to entry-point (generated .d.ts file for main module)
	main: config.buildDir + '/index.d.ts',

	removeSource: true,
};

function createBrowserVersion (inputJs, callback) {
	let outputName = inputJs.replace(/\.[^/.]+$/, "");
	outputName = `${outputName}.browser.js`;
	console.log("Creating browser version ...");

	let b = browserify(inputJs, {
		standalone: bundleOpts.name,
	});

	//noinspection JSUnresolvedFunction,JSCheckFunctionSignatures
	b.bundle((err, src) => {
		if ( err !== null ) {
			console.error("Browserify error:");
			console.error(err);
		} else {
			console.log("Browserify bundling successful");
			callback();
		}
	}).pipe(fs.createWriteStream(outputName));
}

/* helper function to get into build directory */
function libPath(name) {
	if (undefined === name) {
		return config.buildDir;
	}

	return path.join(config.buildDir, name);
}

module.exports = webpackOpts;
