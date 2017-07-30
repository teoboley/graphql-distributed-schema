import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { GraphQLID, GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";

chai.use(chaiAsPromised);
const assert = chai.assert;

import ModularGQL from "../src/index";

describe("Associations", () => {
	describe("#associateWith()", () => {
		beforeEach(() => {
			ModularGQL.type("user", {
				name: "user",
				fields: () => ({
					name: {
						type: GraphQLString
					}
				})
			});

			ModularGQL.type("post", {
				name: "post",
				fields: () => ({
					timestamp: {
						type: GraphQLString
					}
				})
			});
		});

		afterEach(() => {
			ModularGQL.flushRawTypes();
			ModularGQL.flushCompiledTypes();
		});

		const parentResolveFromChild = () => "parent resolve";
		const childResolveFromParent = () => "child resolve";
		const parentConnectionArgs = {
			after: {
				type: new GraphQLNonNull(GraphQLID)
			}
		};
		const childConnectionArgs = {
			before: {
				type: new GraphQLNonNull(GraphQLID)
			}
		};

		context("one to one relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "favoritePost",
					parentResolveFromChild,
					childResolveFromParent,
					parentConnectionArgs,
					childConnectionArgs
				}));

				ModularGQL.generate();
			});

			checkField("parent", () => ({
				obj: ModularGQL.compiled("user").getFields().favoritePost,
				type: ModularGQL.compiled("post"),
				args: childConnectionArgs,
				resolve: childResolveFromParent
			}));

			checkField("child", () => ({
				obj: ModularGQL.compiled("post").getFields().favoritePostOfUser,
				type: ModularGQL.compiled("user"),
				args: parentConnectionArgs,
				resolve: parentResolveFromChild
			}));
		});

		context("one to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "createdPosts",
					childConnection: GraphQLString,
					parentResolveFromChild,
					childResolveFromParent,
					parentConnectionArgs,
					childConnectionArgs
				}));

				ModularGQL.generate();
			});

			checkField("parent", () => ({
				obj: ModularGQL.compiled("user").getFields().createdPosts,
				type: GraphQLString,
				args: childConnectionArgs,
				resolve: childResolveFromParent
			}));

			checkField("child", () => ({
				obj: ModularGQL.compiled("post").getFields().createdPostsOfUser,
				type: ModularGQL.compiled("user"),
				args: parentConnectionArgs,
				resolve: parentResolveFromChild
			}));
		});

		context("many to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "likedPosts",
					parentConnection: GraphQLString,
					childConnection: GraphQLInt,
					parentResolveFromChild,
					childResolveFromParent,
					parentConnectionArgs,
					childConnectionArgs
				}));

				ModularGQL.generate();
			});

			checkField("parent", () => ({
				obj: ModularGQL.compiled("user").getFields().likedPosts,
				type: GraphQLInt,
				args: childConnectionArgs,
				resolve: childResolveFromParent
			}));

			checkField("child", () => ({
				obj: ModularGQL.compiled("post").getFields().likedPostsOfUser,
				type: GraphQLString,
				args: parentConnectionArgs,
				resolve: parentResolveFromChild
			}));
		});
	});
});

function checkField(
	referenceName,
	getConfig: () => { obj; type; args; resolve }
) {
	describe(`${referenceName} field check`, () => {
		let config;
		beforeEach(() => {
			config = getConfig();
			config.args = transformArgs(config.args);
		});

		it(`should add type property to element field`, () =>
			assert.include(config.obj, {
				type: config.type
			}));

		it(`should add args property to element field of ${referenceName} raw type`, done => {
			config.args.forEach(value =>
				assert.nestedProperty(config.obj.args, "[0].name", value)
			);

			done();
		});

		it(`should add resolve method to element field of ${referenceName} raw type`, () =>
			assert.include(config.obj, {
				resolve: config.resolve
			}));
	});
}

function transformArgs(args) {
	let transformedArgs: any[] = [];

	Object.keys(args).forEach((key, index) => {
		// key: the name of the object key
		// index: the ordinal position of the key within the object

		transformedArgs = transformedArgs.concat({
			name: key
			// description: "Hey"
		});
	});

	return transformedArgs;
}
