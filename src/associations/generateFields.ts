import {
	GraphQLBoolean,
	GraphQLList,
	GraphQLID,
	GraphQLNonNull
} from "graphql";
import * as deepMerge from "deepmerge";
import { ModularGraphQL } from "../index";
import { ConfigType, ConfigFn } from "./index";

enum Relationship {
	OneToOne = "OneToOne",
	OneToMany = "OneToMany",
	ManyToMany = "ManyToMany"
}

const defaultConfig = {
	parent: {
		naming: {
			element: name => name,
			singleCheck: (name, itemName) =>
				`has${capitalizeFirstLetter(itemName)}`,
			multiCheck: (name, itemName) => `has${capitalizeFirstLetter(name)}`,
			multiCheckAll: (name, itemName) =>
				`hasAll${capitalizeFirstLetter(name)}`
		}
	},
	child: {
		naming: {
			element: (name, itemName, parentName) =>
				`${itemName}Of${capitalizeFirstLetter(parentName)}`,
			singleCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					parentName
				)}`,
			multiCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					parentName
				)}s`,
			multiCheckAll: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(
					itemName
				)}OfAll${capitalizeFirstLetter(parentName)}s`
		}
	}
};

export default function generateFields(
	parentKey: string,
	childKey: string,
	configFn: ConfigFn,
	modularGQL: ModularGraphQL
) {
	return (currentActor: "parent" | "child") => {
		const config: ConfigType = deepMerge(defaultConfig, configFn() as any);

		const getActorAttributes = actor => {
			const key = actor == "parent" ? parentKey : childKey;

			return {
				actor: actor,
				key,
				rawType: modularGQL.type(key),
				compiledType: modularGQL.compiled(key),
				config: config[actor]
			};
		};

		const current = getActorAttributes(currentActor);
		const associated = getActorAttributes(
			currentActor == "parent" ? "child" : "parent"
		);

		checkMissingFromObject(associated.config, associated.key, [
			"connection",
			"connectionArgs",
			"getIds"
		]);

		const itemName = config.itemName || config.name;

		const fieldName: (
			prop: "element" | "singleCheck" | "multiCheck" | "multiCheckAll"
		) => string = namingFormula =>
			current.config.naming[namingFormula](
				config.name,
				itemName,
				associated.rawType.name
			);

		const fields = {};

		// element field
		fields[fieldName("element")] = {
			type: associated.config.connection
				? associated.config.connection
				: associated.compiledType,
			description: "element field",
			args: associated.config.connectionArgs,
			resolve: associated.config.resolve
		};

		const getIdsToMatchAgainst: ((
			obj: any
		) => string[]) = associatedObj => {
			console.log(`associatedObj: ${JSON.stringify(associatedObj)}`);

			let arr = [];

			if (associated.config.connection) {
				arr = associated.config
					.getIds(associatedObj)
					.map(id => id.toString());
			} else {
				arr = [associated.config.getId(associatedObj).toString()];
			}

			console.log(`associatedObj ids: ${arr}`);

			return arr;
		};

		// single check field
		fields[fieldName("singleCheck")] = {
			type: GraphQLBoolean,
			description: "single check field",
			args: {
				id: {
					type: new GraphQLNonNull(GraphQLID)
				}
			},
			resolve: (currentObj, { id }, context, info?) => {
				return Promise.resolve(
					associated.config.resolve(currentObj, {}, context, info)
				).then(associatedObj => {
					console.log(`Checking id: ${id}`);
					return (
						getIdsToMatchAgainst(associatedObj).indexOf(
							id.toString()
						) > -1
					);
				});
			}
		};

		if (associated.config.connection) {
			if (fieldName("multiCheck") == fieldName("singleCheck")) {
				console.warn(
					"MultiCheck naming for " +
						current.key +
						" (" +
						fieldName("multiCheck") +
						") conflicts with SingleCheck naming (" +
						fieldName("singleCheck") +
						"); bypassing MultiCheck field generation."
				);
			} else {
				// multi check field
				fields[fieldName("multiCheck")] = {
					type: new GraphQLList(GraphQLBoolean),
					description: "multi check field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (currentObj, { ids }, context, info?) => {
						return Promise.resolve(
							associated.config.resolve(
								currentObj,
								{},
								context,
								info
							)
						).then(associatedObj => {
							console.log(`Checking ids: ${ids}`);
							return ids.map(id => {
								return (
									getIdsToMatchAgainst(associatedObj).indexOf(
										id
									) > -1
								);
							});
						});
					}
				};
			}

			if (fieldName("multiCheckAll") == fieldName("multiCheck")) {
				console.warn(
					"MultiCheckAll naming for " +
						current.key +
						" (" +
						fieldName("multiCheckAll") +
						") conflicts with MultiCheck naming (" +
						fieldName("multiCheck") +
						"); bypassing MultiCheckAll field generation."
				);
			} else {
				// multi check all field
				fields[fieldName("multiCheckAll")] = {
					type: GraphQLBoolean,
					description: "multi check all field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (currentObj, { ids }, context, info?) => {
						return Promise.resolve(
							associated.config.resolve(
								currentObj,
								{},
								context,
								info
							)
						).then(associatedObj => {
							console.log(`Checking ids: ${ids}`);
							return ids.reduce(
								(prev, id, index) =>
									prev &&
									getIdsToMatchAgainst(associatedObj).indexOf(
										id.toString()
									) > -1,
								true
							);
						});
					}
				};
			}
		}

		return fields;
	};
}

function checkMissingFromObject(obj, objKey, requiredIfAny, required = []) {
	let triggerKey;
	requiredIfAny.forEach(possiblyMissing => {
		if (obj[possiblyMissing] == null) {
			if (triggerKey) {
				throw new Error(
					`${triggerKey} is provided for ${objKey}, yet ${possiblyMissing} is not defined.`
				);
			}
		} else {
			triggerKey = possiblyMissing;
		}
	});

	required.forEach(possiblyMissing => {
		if (obj[possiblyMissing] == null) {
			throw new Error(
				`${possiblyMissing} is not defined for ${objKey}, yet [${requiredIfAny}] aren't provided.`
			);
		}
	});
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
