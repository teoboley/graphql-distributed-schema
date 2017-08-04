import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";

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
					parent: {
						connectionArgs: parentConnectionArgs,
						resolveFromChild: parentResolveFromChild
					},
					child: {
						connectionArgs: childConnectionArgs,
						resolveFromParent: childResolveFromParent
					}
				}));

				ModularGQL.generate();
			});

			/*
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
			*/
		});

		context("one to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "createdPosts",
					parent: {
						connectionArgs: parentConnectionArgs,
						resolveFromChild: parentResolveFromChild
					},
					child: {
						connection: GraphQLString,
						connectionArgs: childConnectionArgs,
						resolveFromParent: childResolveFromParent
					}
				}));

				ModularGQL.generate();
			});

			/*

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

			*/
		});

		context("many to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "likedPosts",
					itemName: "likedPost",
					parent: {
						connection: GraphQLString,
						connectionArgs: parentConnectionArgs,
						resolveFromChild: parentResolveFromChild,
						namingFormulae: {
							multiCheckAll: () => "haveLikedAllPosts"
						}
					},
					child: {
						connection: GraphQLInt,
						connectionArgs: childConnectionArgs,
						resolveFromParent: childResolveFromParent
					}
				}));

				ModularGQL.generate();
			});

			checkAssociationFields("parent", {
				connection: () => ({
					obj: ModularGQL.compiled("user").getFields(),
					type: GraphQLInt,
					args: childConnectionArgs,
					resolve: childResolveFromParent
				}),
				element: "likedPosts",
				singleCheck: "hasLikedPost",
				multiCheck: "haveLikedPosts",
				multiCheckAll: "haveLikedAllPosts"
			});

			checkAssociationFields("child", {
				connection: () => ({
					obj: ModularGQL.compiled("post").getFields(),
					type: GraphQLString,
					args: parentConnectionArgs,
					resolve: parentResolveFromChild
				}),
				element: "likedPostOfUser",
				singleCheck: "isLikedPostOfUser",
				multiCheck: "isLikedPostOfUsers",
				multiCheckAll: "isLikedPostOfAllUsers"
			});
		});
	});
});

function checkAssociationFields(
	referenceName: string,
    config: {
	    connection: () => { obj; type; args; resolve };
		element?: string;
	    singleCheck?: string;
	    multiCheck?: string;
	    multiCheckAll?: string;
    }
) {
	describe(`${referenceName} fields check`, () => {
		let connection;
		beforeEach(() => {
			connection = config.connection();
		});

		if (config.element) {
			checkField("element", () => ({
				obj: connection.obj[config.element],
				type: connection.type,
				args: connection.args,
				resolve: connection.resolve
			}));
		}

		if (config.singleCheck) {
			checkField("single check", () => ({
				obj: connection.obj[config.singleCheck],
				type: GraphQLBoolean,
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: () => ({})
			}));
		}

		if (config.multiCheck) {
			checkField("multi check", () => ({
				obj: connection.obj[config.multiCheck],
				type: new GraphQLList(GraphQLBoolean),
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: null
			}));
		}

		if (config.multiCheckAll) {
			checkField("multi check all", () => ({
				obj: connection.obj[config.multiCheckAll],
				type: GraphQLBoolean,
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: null
			}));
		}
	});
}

function checkField(
	referenceName: string,
	getConfig: () => { obj; type; args; resolve }
) {
	describe(`${referenceName} field`, () => {
		let config;
		beforeEach(() => {
			config = getConfig();
			config.args = transformArgs(config.args);
		});

		it(`should add correct type property`, () =>
			assert.deepInclude(config.obj, {
				type: config.type
			}));

		it(`should add correct args property`, done => {
			config.args.forEach(value =>
				assert.nestedProperty(config.obj.args, "[0].name", value)
			);

			done();
		});

		it(`should add correct resolve method`, () =>
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
