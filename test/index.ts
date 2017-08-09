import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { graphql, GraphQLSchema, GraphQLString } from "graphql";

chai.use(chaiAsPromised);
const assert = chai.assert;

import ModularGQL from "../src/index";

describe("ModularGraphQL", function() {
	beforeEach(function() {
		ModularGQL.type("query", {
			name: "query",
			fields: () => ({
				helloworld: {
					type: GraphQLString,
					resolve: () => "Hello!"
				}
			})
		});
	});

	afterEach(function() {
		ModularGQL.flushRawTypes();
		ModularGQL.flushCompiledTypes();
	});

	describe("#type()", function() {
		it("should return IDistributedRawType when querying existing key", () => {
			return assert.property(
				ModularGQL.type("query"),
				"fieldsCollection"
			);
		});

		it("should throw error when attempting to redefine existing type", () => {
			return assert.throw(() => {
				ModularGQL.type("query", {
					name: "query",
					fields: () => ({})
				});
			}, Error);
		});
	});

	describe("#generate()", function() {});

	describe("#compiled()", function() {
		beforeEach(function() {
			ModularGQL.generate();
		});

		it("should return GraphQLObjectType", function() {
			return assert.property(ModularGQL.compiled("query"), "getFields");
		});

		it("should produce queryable types", function() {
			const schema = new GraphQLSchema({
				query: ModularGQL.compiled("query")
			});

			return assert.eventually.deepEqual(
				graphql(schema, "query { helloworld }"),
				{
					data: {
						helloworld: "Hello!"
					}
				}
			);
		});
	});
});

require("./associations");
