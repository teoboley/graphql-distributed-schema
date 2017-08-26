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

		context("preferences", function() {
			const prefQuery = (id, fragment) =>
				rootQuery(`
					preferenceSet(id: ${id}) {
						${fragment}
					}
				`).then(data => data.preferenceSet);

			it("returns an object when querying preferenceSet(id: '0')", function() {
				return assert.eventually.isObject(
					prefQuery(
						"0",
						`
						displayName
					`
					)
				);
			});

			context("preferenceSet", function() {
				context("element field", function() {
					it("returns an object when querying preferenceSet(id: '0').preferenceSetOfUser", function() {
						return assert.eventually.isObject(
							prefQuery(
								"0",
								`
								preferenceSetOfUser {
									name
								}
								`
							).then(pref => pref.preferenceSetOfUser)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying preferenceSet(id: '0').isPreferenceSetOfUser('0')", function() {
						return assert.eventually.isTrue(
							prefQuery(
								"0",
								`
						isPreferenceSetOfUser(id: "0")
					`
							).then(pref => pref.isPreferenceSetOfUser)
						);
					});

					it("returns false when querying preferenceSet(id: '0').isPreferenceSetOfUser('1')", function() {
						return assert.eventually.isFalse(
							prefQuery(
								"0",
								`
						isPreferenceSetOfUser(id: "1")
					`
							).then(pref => pref.isPreferenceSetOfUser)
						);
					});

					it("returns false when querying preferenceSet(id: '0').isPreferenceSetOfUser('2')", function() {
						return assert.eventually.isFalse(
							prefQuery(
								"0",
								`
						isPreferenceSetOfUser(id: "2")
					`
							).then(pref => pref.isPreferenceSetOfUser)
						);
					});
				});
			});
		});

		context("post", function() {
			const postQuery = (id, fragment) =>
				rootQuery(`
					post(id: ${id}) {
						${fragment}
					}
				`).then(data => data.post);

			it("returns an object when querying post(id: '0')", function() {
				return assert.eventually.isObject(
					postQuery(
						"0",
						`
						title
					`
					)
				);
			});

			context("createdPosts", function() {
				context("element field", function() {
					it("returns an array when querying post(id: '0').createdPostOfUser", function() {
						return assert.eventually.isObject(
							postQuery(
								"0",
								`
								createdPostOfUser {
									name
								}
								`
							).then(post => post.createdPostOfUser)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying post(id: '0').isCreatedPostOfUser('0')", function() {
						return assert.eventually.isTrue(
							postQuery(
								"0",
								`
						isCreatedPostOfUser(id: "0")
					`
							).then(post => post.isCreatedPostOfUser)
						);
					});

					it("returns false when querying post(id: '0').isCreatedPostOfUser('1')", function() {
						return assert.eventually.isFalse(
							postQuery(
								"0",
								`
						isCreatedPostOfUser(id: "1")
					`
							).then(post => post.isCreatedPostOfUser)
						);
					});

					it("returns false when querying post(id: '0').isCreatedPostOfUser('3')", function() {
						return assert.eventually.isFalse(
							postQuery(
								"0",
								`
						isCreatedPostOfUser(id: "3")
					`
							).then(post => post.isCreatedPostOfUser)
						);
					});
				});
			});

			context("likedPosts", function() {
				context("element field", function() {
					it("returns an array when querying post(id: '0').likedPostOfUser", function() {
						return assert.eventually.isArray(
							postQuery(
								"0",
								`
								likedPostOfUser {
									name
								}
								`
							).then(post => post.likedPostOfUser)
						);
					});
				});

				context("single check", function() {
					it("returns true when querying post(id: '0').isLikedPostOfUser('2')", function() {
						return assert.eventually.isTrue(
							postQuery(
								"0",
								`
						isLikedPostOfUser(id: "2")
					`
							).then(post => post.isLikedPostOfUser)
						);
					});

					it("returns false when querying post(id: '0').isLikedPostOfUser('0')", function() {
						return assert.eventually.isFalse(
							postQuery(
								"0",
								`
						isLikedPostOfUser(id: "0")
					`
							).then(post => post.isLikedPostOfUser)
						);
					});

					it("returns true when querying post(id: '0').isLikedPostOfUser('1')", function() {
						return assert.eventually.isTrue(
							postQuery(
								"0",
								`
						isLikedPostOfUser(id: "1")
					`
							).then(post => post.isLikedPostOfUser)
						);
					});
				});

				context("multi check", function() {
					it("returns [true] when querying post(id: '0').isLikedPostOfUsers(['2'])", function() {
						return assert.eventually.sameOrderedMembers(
							postQuery(
								"0",
								`
						isLikedPostOfUsers(ids: ["2"])
					`
							).then(post => post.isLikedPostOfUsers),
							[true]
						);
					});

					it("returns [false, true] when querying post(id: '0').isLikedPostOfUsers(['0', '2'])", function() {
						return assert.eventually.sameOrderedMembers(
							postQuery(
								"0",
								`
						isLikedPostOfUsers(ids: ["0", "2"])
					`
							).then(post => post.isLikedPostOfUsers),
							[false, true]
						);
					});

					it("returns [true, false] when querying post(id: '0').isLikedPostOfUsers(['1', '3'])", function() {
						return assert.eventually.sameOrderedMembers(
							postQuery(
								"0",
								`
						isLikedPostOfUsers(ids: ["1", "3"])
					`
							).then(post => post.isLikedPostOfUsers),
							[true, false]
						);
					});
				});

				context("multi check all", function() {
					it("returns true when querying post(id: '0').isLikedPostOfAllUsers(['2'])", function() {
						return assert.eventually.isTrue(
							postQuery(
								"0",
								`
						isLikedPostOfAllUsers(ids: ["2"])
					`
							).then(post => post.isLikedPostOfAllUsers)
						);
					});

					it("returns false when querying post(id: '0').isLikedPostOfAllUsers(['0', '2'])", function() {
						return assert.eventually.isFalse(
							postQuery(
								"0",
								`
						isLikedPostOfAllUsers(ids: ["0", "2"])
					`
							).then(post => post.isLikedPostOfAllUsers)
						);
					});

					it("returns true when querying post(id: '0').isLikedPostOfAllUsers(['1', '2'])", function() {
						return assert.eventually.isTrue(
							postQuery(
								"0",
								`
						isLikedPostOfAllUsers(ids: ["1", "2"])
					`
							).then(post => post.isLikedPostOfAllUsers)
						);
					});
				});
			});
		});
	});
});
