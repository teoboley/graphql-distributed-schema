import {
	GraphQLID,
	GraphQLList,
	GraphQLObjectType,
	GraphQLSchema,
	GraphQLString,
	printSchema
} from "graphql";
import { connectionArgs } from "graphql-relay";
import { addResolveFunctionsToSchema } from "graphql-tools";
import * as chalk from "chalk";

import { ModularGraphQL } from "../../src";

import DataStore from "./data";

// const log = console.log;
const log = (msg: any) => ({});

export default class MockSchema {
	private modularGQL: ModularGraphQL;

	constructor(modularGQL: ModularGraphQL) {
		this.modularGQL = modularGQL;
	}

	public configureTypes() {
		// Define types
		this.modularGQL.type("user", {
			name: "user",
			fields: () => ({
				name: {
					type: GraphQLString
				}
			})
		});

		this.modularGQL.type("post", {
			name: "post",
			fields: () => ({
				title: {
					type: GraphQLString
				}
			})
		});

		this.modularGQL.type("preferences", {
			name: "preferences",
			fields: () => ({
				displayName: {
					type: GraphQLString
				}
			})
		});
	}

	public configureAssociations() {
		// One To One
		this.modularGQL.type("user").associateWith("preferences", () => ({
			name: "preferenceSet",
			parent: {
				resolve: prefObj => {
					log(
						chalk.yellow(
							"*preferenceSet: Resolving user from preferences"
						)
					);
					return DataStore.users[prefObj.userId];
				},
				getId: user => DataStore.users.indexOf(user).toString()
			},
			child: {
				resolve: userObj => {
					log(
						chalk.yellow(
							"*preferenceSet: Resolving preferences from user"
						)
					);
					return DataStore.preferences.filter(preference => {
						return (
							preference.userId ===
							DataStore.users.indexOf(userObj)
						);
					})[0];
				},
				getId: pref => DataStore.preferences.indexOf(pref).toString()
			}
		}));

		// One to Many
		this.modularGQL.type("user").associateWith("post", () => ({
			name: "createdPosts",
			itemName: "createdPost",
			parent: {
				resolve: postObj => {
					log(
						chalk.yellow("*createdPosts: Resolving user from post")
					);
					return DataStore.users[postObj.userId];
				},
				getId: user => DataStore.users.indexOf(user).toString()
			},
			child: {
				connection: new GraphQLList(this.modularGQL.compiled("post")),
				connectionArgs,
				resolve: userObj => {
					log(
						chalk.yellow("*createdPosts: Resolving posts from user")
					);
					return DataStore.posts.filter(post => {
						return post.userId === DataStore.users.indexOf(userObj);
					});
				},
				getIds: posts =>
					posts.map(post => DataStore.posts.indexOf(post).toString())
			}
		}));

		// Many to Many
		this.modularGQL.type("user").associateWith("post", () => ({
			name: "likedPosts",
			itemName: "likedPost",
			parent: {
				connection: new GraphQLList(this.modularGQL.compiled("user")),
				connectionArgs,
				resolve: postObj => {
					log(chalk.yellow("*likedPosts: Resolving users from post"));
					return postObj.likedBy.map(id => DataStore.users[id]);
				},
				getIds: users =>
					users.map(user => DataStore.users.indexOf(user).toString())
			},
			child: {
				connection: new GraphQLList(this.modularGQL.compiled("post")),
				connectionArgs,
				resolve: userObj => {
					log(chalk.yellow("*likedPosts: Resolving posts from user"));

					return DataStore.posts.filter(
						post =>
							post.likedBy.indexOf(
								DataStore.users.indexOf(userObj)
							) > -1
					);
				},
				getIds: posts =>
					posts.map(post => DataStore.posts.indexOf(post).toString())
			}
		}));
	}

	public generateSchema(): GraphQLSchema {
		const schema = new GraphQLSchema({
			query: new GraphQLObjectType({
				name: "RootQuery",
				fields: () => ({
					user: {
						type: this.modularGQL.compiled("user"),
						args: {
							id: {
								type: GraphQLID
							}
						}
					},
					users: {
						type: new GraphQLList(this.modularGQL.compiled("user"))
					},
					post: {
						type: this.modularGQL.compiled("post"),
						args: {
							id: {
								type: GraphQLID
							}
						}
					},
					posts: {
						type: new GraphQLList(this.modularGQL.compiled("post"))
					},
					preferenceSet: {
						type: this.modularGQL.compiled("preferences"),
						args: {
							id: {
								type: GraphQLID
							}
						}
					},
					preferenceSets: {
						type: new GraphQLList(
							this.modularGQL.compiled("preferences")
						)
					}
				})
			})
		});

		const resolvers = {
			RootQuery: {
				user(_, { id }) {
					return DataStore.users[Number(id)];
				},
				users() {
					return DataStore.users;
				},
				post(_, { id }) {
					return DataStore.posts[Number(id)];
				},
				posts() {
					return DataStore.posts;
				},
				preferenceSet(_, { id }) {
					return DataStore.preferences[Number(id)];
				},
				preferenceSets() {
					return DataStore.preferences;
				}
			}
		};

		addResolveFunctionsToSchema(schema, resolvers);

		const fs = require("fs");
		fs.writeFile("dist/mockSchema.graphql", printSchema(schema), err => {
			if (err) {
				throw err;
			}
		});

		return schema;
	}
}
