import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {
	GraphQLBoolean,
	GraphQLID,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLString
} from "graphql";

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
			ModularGQL.flush();
		});

		const parentResolveFromChild = (childObj, args, context, info) => "parent resolve";
		const childResolveFromParent = (parentObj, args, context, info) => "child resolve";
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
						resolve: parentResolveFromChild
					},
					child: {
						connectionArgs: childConnectionArgs,
						resolve: childResolveFromParent
					}
				}));

				ModularGQL.generate();
			});

			checkAssociationFields("parent", {
				connection: () => ({
					obj: ModularGQL.compiled("user").getFields(),
					type: ModularGQL.compiled("post"),
					args: childConnectionArgs,
					resolve: childResolveFromParent
				}),
				element: "favoritePost",
				singleCheck: "hasFavoritePost"
			});

			checkAssociationFields("child", {
				connection: () => ({
					obj: ModularGQL.compiled("post").getFields(),
					type: ModularGQL.compiled("user"),
					resolve: parentResolveFromChild
				}),
				element: "favoritePostOfUser",
				singleCheck: "isFavoritePostOfUser"
			});
		});

		context("one to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "createdPosts",
					itemName: "createdPost",
					parent: {
						resolve: parentResolveFromChild,
						naming: {
							multiCheckAll: () => "hasCreatedAllPosts"
						}
					},
					child: {
						connection: GraphQLString,
						connectionArgs: childConnectionArgs,
						resolve: childResolveFromParent
					}
				}));

				ModularGQL.generate();
			});

			checkAssociationFields("parent", {
				connection: () => ({
					obj: ModularGQL.compiled("user").getFields(),
					type: ModularGQL.compiled("post"),
					args: childConnectionArgs,
					resolve: childResolveFromParent
				}),
				element: "createdPosts",
				singleCheck: "hasCreatedPost",
				multiCheck: "hasCreatedPosts",
				multiCheckAll: "hasCreatedAllPosts"
			});

			checkAssociationFields("child", {
				connection: () => ({
					obj: ModularGQL.compiled("post").getFields(),
					type: ModularGQL.compiled("user"),
					resolve: parentResolveFromChild
				}),
				element: "createdPostOfUser",
				singleCheck: "isCreatedPostOfUser"
			});
		});

		context("many to many relationship", () => {
			beforeEach(() => {
				ModularGQL.type("user").associateWith("post", () => ({
					name: "likedPosts",
					itemName: "likedPost",
					parent: {
						connection: GraphQLString,
						connectionArgs: parentConnectionArgs,
						resolve: parentResolveFromChild,
						naming: {
							multiCheckAll: () => "hasLikedAllPosts"
						}
					},
					child: {
						connection: GraphQLInt,
						connectionArgs: childConnectionArgs,
						resolve: childResolveFromParent
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
				multiCheck: "hasLikedPosts",
				multiCheckAll: "hasLikedAllPosts"
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
		connection: () => { obj; type; args?; resolve };
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
			checkField("element", {
				obj: () => connection.obj[config.element],
				type: () => connection.type,
				args: () => (connection.args ? connection.args : {}),
				resolve: () => connection.resolve
			});
		}

		if (config.singleCheck) {
			checkField("single check", {
				obj: () => connection.obj[config.singleCheck],
				type: () => GraphQLBoolean,
				args: () => ({
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				}),
				resolves: () => [
					{
						from: {
							obj: {}
						},
						to: true
					}
				]
			});
		}

		if (config.multiCheck) {
			checkField("multi check", {
				obj: () => connection.obj[config.multiCheck],
				type: () => new GraphQLList(GraphQLBoolean),
				args: () => ({
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				})
			});
		}

		if (config.multiCheckAll) {
			checkField("multi check all", {
				obj: () => connection.obj[config.multiCheckAll],
				type: () => GraphQLBoolean,
				args: () => ({
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				})
			});
		}
	});
}

function checkField(
	referenceName: string,
	config: {
		obj: () => any;
		type?: () => any;
		args?: () => any;
		resolve?: () => any;
		resolves?: () => [
			{
				from: {
					obj?: any;
					args?: any;
					context?: any;
					info?: any;
				};
				to: any;
			}
		];
	}
) {
	describe(`${referenceName} field`, () => {
		let transformedArgs = [];
		beforeEach(() => {
			if (config.args) {
				transformedArgs = transformArgs(config.args());
			}
		});

		if (config.type) {
			it(`should add correct type property`, () =>
				assert.deepInclude(config.obj(), {
					type: config.type()
				}));
		}

		if (config.args) {
			it(`should add correct args property`, done => {
				transformedArgs.forEach(value =>
					assert.nestedProperty(config.obj().args, "[0].name", value)
				);

				done();
			});
		}

		if (config.resolve) {
			it(`should add correct resolve method`, () =>
				assert.include(config.obj(), {
					resolve: config.resolve()
				}));
		}

		if (config.resolves) {
			config.resolves().forEach((resolve, index) => {
				it(`should resolve correctly given input set ${index}`, () =>
					assert.deepEqual(
						config
							.obj()
							.resolve(
								resolve.from.obj,
								resolve.from.args,
								resolve.from.context,
								resolve.from.info
							),
						resolve.to
					));
			});
		}
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
