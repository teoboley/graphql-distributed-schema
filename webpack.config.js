const webpack = require("webpack");
const browserify = require("browserify");
const path = require("path");
const fs = require("fs");
const dtsGenerator = require('dts-generator');

const nodeExternals = require("webpack-node-externals");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WebpackOnBuildPlugin = require('on-build-webpack');

const config = {
	srcDir: "src",
	buildDir: "dist"
};

const webpackOpts = {
	entry: {
		index: './src/index.ts',
		tests: './test/index.ts'
	},
	target: 'node',
	output: {
		filename: libPath('[name].js'),
		libraryTarget: "commonjs2"
	},
	resolve: {
		extensions: ['.ts', '.js'],
		modules: [
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
			createBrowserVersion(libPath("index.js"), () => {
				// Invokes dts bundling
				console.log("Bundling d.ts files ...");
				dtsGenerator.default(bundleOpts);
				console.log("d.ts files bundled");
			});
		})
	]
};

const bundleOpts = {
	project: "src",
	out: "dist/index.d.ts",
	main: "modular-graphql/index",
	name: "modular-graphql",
	verbose: true,
	sendMessage: console.log
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
	if (name === undefined) {
		return config.buildDir;
	}

	return path.join(config.buildDir, name);
}

module.exports = webpackOpts;
