import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap,
	GraphQLList,
	GraphQLID,
	GraphQLNonNull,
	GraphQLObjectType
} from "graphql";
import * as deepMerge from "deepmerge";
import { IDistributedRawType, ModularGraphQL } from "./index";

enum Relationship {
	OneToOne = "OneToOne",
	OneToMany = "OneToMany",
	ManyToMany = "ManyToMany"
}

export interface IAssociationConfig {
	name: string;
	itemName?: string;

	parent: {
		connection?: any;
		connectionArgs?: GraphQLFieldConfigArgumentMap;
		resolve: (child, args, context, info) => any;
		checking?: {
			primaryKey?: string;
			edgeName?: string;
			transformObj?: (obj: any) => any;
			transformArgs?: (args: any) => any;
			transformResult?: (obj: any) => any;
		};
		naming?: {
			element?: (name, itemName, childName) => string;
			singleCheck?: (name, itemName, childType) => string;
			multiCheck?: (name, itemName, childType) => string;
			multiCheckAll?: (name, itemName, childType) => string;
		};
	};

	child: {
		connection?: any;
		connectionArgs?: GraphQLFieldConfigArgumentMap;
		resolve: (parent, args, context, info) => any;
		checking?: {
			primaryKey?: string;
			edgeName?: string;
			transformObj?: (obj: any) => any;
			transformArgs?: (args: any) => any;
			transformResult?: (obj: any) => any;
		};
		naming?: {
			element?: (name, itemName, parentType) => string;
			singleCheck?: (name, itemName, parentType) => string;
			multiCheck?: (name, itemName, parentType) => string;
			multiCheckAll?: (name, itemName, parentType) => string;
		};
	};
}

export type IAssociationRawFunction = (
	childKey: string,
	config: () => IAssociationConfig
) => void;

const defaultConfig: IAssociationConfig = {
	name: "",
	parent: {
		resolve: null,
		checking: {
			primaryKey: "id",
			transformObj: obj => obj,
			transformArgs: args => args,
			transformResult: result => result
		},
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
		resolve: null,
		checking: {
			primaryKey: "id",
			transformObj: obj => obj,
			transformArgs: args => args,
			transformResult: result => result
		},
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

export function associator(
	parentKey: string,
	modularGQL: ModularGraphQL
): IAssociationRawFunction {
	return (childKey: string, configFn: () => IAssociationConfig) => {
		const parent = modularGQL.type(parentKey);
		const child = modularGQL.type(childKey);

		parent.extend(() =>
			generateFields("parent", parentKey, childKey, configFn, modularGQL)
		);

		child.extend(() =>
			generateFields("child", childKey, parentKey, configFn, modularGQL)
		);
	};
}

function generateFields(
	actor: "parent" | "child",
	typeKey: string,
	associatedTypeKey: string,
	configFn,
	modularGQL: ModularGraphQL
) {
	const config = extractConfig(configFn);
	const itemName = config.itemName || config.name;

	const current = {
		actor: actor,
		key: typeKey,
		rawType: modularGQL.type(typeKey),
		compiledType: modularGQL.compiled(typeKey),
		config: config[actor]
	};

	const associated = {
		actor: actor == "parent" ? "child" : "parent",
		key: associatedTypeKey,
		rawType: modularGQL.type(associatedTypeKey),
		compiledType: modularGQL.compiled(associatedTypeKey),
		config: config[actor == "parent" ? "child" : "parent"]
	};

	const fieldName: (
		prop: "element" | "singleCheck" | "multiCheck" | "multiCheckAll"
	) => string = namingFormula =>
		current.config.naming[namingFormula](
			config.name,
			itemName,
			associated.rawType.name
		);

	const getAssociatedEdges: (obj: any) => Array<any> = obj => {
		const edgeName = associated.config.checking.edgeName;
		return edgeName && obj[edgeName] ? obj[edgeName] : obj;
	};

	const fields = {};

	// element field
	fields[fieldName("element")] = {
		type:
			config.relationship == Relationship.OneToOne ||
			config.relationship == Relationship.OneToMany
				? associated.compiledType
				: associated.config.connection,
		description: "element field",
		args: associated.config.connectionArgs,
		resolve: associated.config.resolve
	};

	const associatedResolve = callback => {
		return (currentObj, args, context, info?) => {
			currentObj = associated.config.checking.transformObj(currentObj); // FIXME: Weird naming?
			args = associated.config.checking.transformArgs(args);

			return Promise.resolve(
				associated.config.resolve(currentObj, {}, context, info)
			).then(associatedObj => {
				return callback(currentObj, associatedObj, args, context, info);
			});
		};
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
		resolve: associatedResolve(
			(currentObj, associatedObj, { id }, context, info?) => {
				return (
					getAssociatedEdges(associatedObj)[
						associated.config.checking.primaryKey
					] === id
				);
			}
		)
	};

	if (
		(current.actor === "parent" &&
			config.relationship !== Relationship.OneToOne) ||
		(current.actor === "child" &&
			config.relationship === Relationship.ManyToMany)
	) {
		// multi check field
		fields[fieldName("multiCheck")] = {
			type: new GraphQLList(GraphQLBoolean),
			description: "multi check field",
			args: {
				ids: {
					type: new GraphQLNonNull(new GraphQLList(GraphQLID))
				}
			},
			resolve: associatedResolve(
				(currentObj, associatedObj, { ids }, context, info?) => {
					return getAssociatedEdges(associatedObj).map(
						(obj, index) =>
							ids.indexOf(
								obj[associated.config.checking.primaryKey]
							) != -1
					);
				}
			)
		};

		// multi check all field
		fields[fieldName("multiCheckAll")] = {
			type: GraphQLBoolean,
			description: "multi check all field",
			args: {
				ids: {
					type: new GraphQLNonNull(new GraphQLList(GraphQLID))
				}
			},
			resolve: associatedResolve(
				(currentObj, associatedObj, { ids }, context, info?) => {
					return getAssociatedEdges(
						associatedObj
					).reduce((prev, obj, index) => {
						return (
							prev &&
							ids.indexOf(
								obj[associated.config.checking.primaryKey]
							) != -1
						);
					}, true);
				}
			)
		};
	}

	return fields;
}

interface IExtractedConfig extends IAssociationConfig {
	relationship: Relationship;
}

function extractConfig(configFn: () => IAssociationConfig): IExtractedConfig {
	const config = deepMerge(defaultConfig, configFn());

	let relationship = Relationship.OneToOne;

	if (config.parent.connection) {
		relationship = Relationship.ManyToMany;
	} else if (config.child.connection) {
		relationship = Relationship.OneToMany;
	}

	return {
		...config,
		relationship
	};
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
