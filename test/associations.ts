import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { graphql, GraphQLSchema } from "graphql";

chai.use(chaiAsPromised);
const assert = chai.assert;

import ModularGQL from "../src/index";
import MockSchema from "./fixtures";

const mockSchema = new MockSchema(ModularGQL);

describe("Associations", function() {
	beforeEach(function() {
		mockSchema.configureTypes();
		mockSchema.configureAssociations();

		ModularGQL.generate();
	});

	afterEach(function() {
		ModularGQL.flush();
	});

	context("Against endpoints", function() {
		let schema: GraphQLSchema;
		beforeEach(function() {
			// generate graphql endpoints
			schema = mockSchema.generateSchema();
		});

		const rootQuery = query =>
			graphql(
				schema,
				`
			query {
				${query}
			}
		`
			).then(({ errors, data }) => {
				if (errors) {
					console.warn(
						"---------------\nGraphQL Errors: \n---------------\n" +
							"- " +
							errors
								.map(error => error.toString())
								.reduce(
									(errList, error) =>
										error + "\n" + "- " + errList
								)
					);
				}

				return data;
			});

		context("user", function() {
			const userQuery = (id, fragment) =>
				rootQuery(`
					user(id: ${id}) {
						${fragment}
					}
				`).then(data => data.user);

			it("returns an object when querying user(id: '0')", function() {
				return assert.eventually.isObject(
					userQuery(
						"0",
						`
						name
					`
					)
				);
			});

			context("preferenceSet", function() {
				context("element field", function() {
					it("returns an object when querying user(id: '0').preferenceSet", function() {
						return assert.eventually.isObject(
							userQuery(
								"0",
								`
								preferenceSet {
									displayName
								}
								`
							).then(user => user.preferenceSet)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying user(id: '0').hasPreferenceSet('0')", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasPreferenceSet(id: "0")
					`
							).then(user => user.hasPreferenceSet)
						);
					});

					it("returns false when querying user(id: '0').hasPreferenceSet('1')", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasPreferenceSet(id: "1")
					`
							).then(user => user.hasPreferenceSet)
						);
					});

					it("returns false when querying user(id: '0').hasPreferenceSet('2')", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasPreferenceSet(id: "2")
					`
							).then(user => user.hasPreferenceSet)
						);
					});
				});
			});

			context("createdPosts", function() {
				context("element field", function() {
					it("returns an array when querying user(id: '0').createdPosts", function() {
						return assert.eventually.isArray(
							userQuery(
								"0",
								`
								createdPosts {
									title
								}
								`
							).then(user => user.createdPosts)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying user(id: '0').hasCreatedPost('1')", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasCreatedPost(id: "1")
					`
							).then(user => user.hasCreatedPost)
						);
					});

					it("returns false when querying user(id: '0').hasCreatedPost('2')", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasCreatedPost(id: "2")
					`
							).then(user => user.hasCreatedPost)
						);
					});

					it("returns true when querying user(id: '0').hasCreatedPost('0')", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasCreatedPost(id: "0")
					`
							).then(user => user.hasCreatedPost)
						);
					});
				});

				context("multi check", function() {
					it("returns [true] when querying user(id: '0').hasCreatedPosts(['0'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasCreatedPosts(ids: ["0"])
					`
							).then(user => user.hasCreatedPosts),
							[true]
						);
					});

					it("returns [false, true] when querying user(id: '0').hasCreatedPosts(['2', '0'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasCreatedPosts(ids: ["2", "0"])
					`
							).then(user => user.hasCreatedPosts),
							[false, true]
						);
					});

					it("returns [false] when querying user(id: '0').hasCreatedPosts(['3'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasCreatedPosts(ids: ["3"])
					`
							).then(user => user.hasCreatedPosts),
							[false]
						);
					});
				});

				context("multi check all", function() {
					it("returns true when querying user(id: '0').hasAllCreatedPosts(['0'])", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasAllCreatedPosts(ids: ["0"])
					`
							).then(user => user.hasAllCreatedPosts)
						);
					});

					it("returns true when querying user(id: '0').hasAllCreatedPosts(['0', '1'])", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasAllCreatedPosts(ids: ["0", "1"])
					`
							).then(user => user.hasAllCreatedPosts)
						);
					});

					it("returns false when querying user(id: '0').hasAllCreatedPosts(['0', '2'])", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasAllCreatedPosts(ids: ["0", "2"])
					`
							).then(user => user.hasAllCreatedPosts)
						);
					});

					it("returns false when querying user(id: '0').hasAllCreatedPosts(['3'])", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasAllCreatedPosts(ids: ["3"])
					`
							).then(user => user.hasAllCreatedPosts)
						);
					});
				});
			});

			context("likedPosts", function() {
				context("element field", function() {
					it("returns an array when querying user(id: '0').likedPosts", function() {
						return assert.eventually.isArray(
							userQuery(
								"0",
								`
								likedPosts {
									title
								}
								`
							).then(user => user.likedPosts)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying user(id: '0').hasLikedPost('2')", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasLikedPost(id: "2")
					`
							).then(user => user.hasLikedPost)
						);
					});

					it("returns false when querying user(id: '0').hasLikedPost('0')", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasLikedPost(id: "0")
					`
							).then(user => user.hasLikedPost)
						);
					});

					it("returns false when querying user(id: '0').hasLikedPost('1')", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasLikedPost(id: "1")
					`
							).then(user => user.hasLikedPost)
						);
					});
				});

				context("multi check", function() {
					it("returns [true] when querying user(id: '0').hasLikedPosts(['2'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasLikedPosts(ids: ["2"])
					`
							).then(user => user.hasLikedPosts),
							[true]
						);
					});

					it("returns [false, true] when querying user(id: '0').hasLikedPosts(['0', '2'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasLikedPosts(ids: ["0", "2"])
					`
							).then(user => user.hasLikedPosts),
							[false, true]
						);
					});

					it("returns [false] when querying user(id: '0').hasLikedPosts(['1'])", function() {
						return assert.eventually.sameOrderedMembers(
							userQuery(
								"0",
								`
						hasLikedPosts(ids: ["1"])
					`
							).then(user => user.hasLikedPosts),
							[false]
						);
					});
				});

				context("multi check all", function() {
					it("returns true when querying user(id: '0').hasAllLikedPosts(['2'])", function() {
						return assert.eventually.isTrue(
							userQuery(
								"0",
								`
						hasAllLikedPosts(ids: ["2"])
					`
							).then(user => user.hasAllLikedPosts)
						);
					});

					it("returns false when querying user(id: '0').hasAllLikedPosts(['0', '2'])", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasAllLikedPosts(ids: ["0", "2"])
					`
							).then(user => user.hasAllLikedPosts)
						);
					});

					it("returns false when querying user(id: '0').hasAllLikedPosts(['1'])", function() {
						return assert.eventually.isFalse(
							userQuery(
								"0",
								`
						hasAllLikedPosts(ids: ["1"])
					`
							).then(user => user.hasAllLikedPosts)
						);
					});
				});
			});
		});
	});
});
