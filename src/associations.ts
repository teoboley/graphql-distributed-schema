import {
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap,
	GraphQLObjectType
} from "graphql";
import { ModularGraphQL } from "./index";

export interface IAssociationConfig {
	name: string;
	parentConnection?: GraphQLObjectType | string;
	parentConnectionArgs?: GraphQLFieldConfigArgumentMap;
	parentResolveFromChild?: (child, args, context, info) => any;
	childConnection?: GraphQLObjectType | string;
	childConnectionArgs?: GraphQLFieldConfigArgumentMap;
	childResolveFromParent?: (parent, args, context, info) => any;
}

export type IAssociationRawFunction = (
	childKey: string,
	config: IAssociationConfig
) => void;

enum Relationship {
	OneToOne = "OneToOne",
	OneToMany = "OneToMany",
	ManyToMany = "ManyToMany"
}

export function associator(
	parentKey: string,
	modularGQL: ModularGraphQL
): IAssociationRawFunction {
	return (childKey: string, config: IAssociationConfig) => {
		const parent = modularGQL.type(parentKey);
		const child = modularGQL.type(childKey);

		let relationship = Relationship.OneToOne;
		let parentConnection: any = null;
		let childConnection: any = null;

		if (config.parentConnection) {
			relationship = Relationship.ManyToMany;

			parentConnection = resolveCompiledFromTypeOrString(
				config.parentConnection,
				modularGQL
			);

			if (config.childConnection) {
				childConnection = resolveCompiledFromTypeOrString(
					config.childConnection,
					modularGQL
				);
			}
		} else if (config.childConnection) {
			relationship = Relationship.OneToMany;

			childConnection = resolveCompiledFromTypeOrString(
				config.childConnection,
				modularGQL
			);
		}

		parent.extend(() => {
			const elementField: GraphQLFieldConfig =
				relationship == Relationship.OneToOne
					? {
							// single
							type: modularGQL.compiled(childKey),
							args: config.childConnectionArgs,
							resolve: config.childResolveFromParent
						}
					: {
							// multiple
							type: childConnection,
							args: config.childConnectionArgs,
							resolve: config.childResolveFromParent
						};

			return {
				[config.name]: elementField
			};
		});

		child.extend(() => {
			const elementField: GraphQLFieldConfig =
				relationship == Relationship.OneToOne ||
				relationship == Relationship.OneToMany
					? {
							// single
							type: modularGQL.compiled(parentKey),
							args: config.parentConnectionArgs,
							resolve: config.parentResolveFromChild
						}
					: {
							// multiple
							type: parentConnection,
							args: config.parentConnectionArgs,
							resolve: config.parentResolveFromChild
						};

			return {
				[`${config.name}Of${capitalizeFirstLetter(
					modularGQL.type(parentKey).name
				)}`]: elementField
			};
		});
	};
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function resolveCompiledFromTypeOrString(
	keyOrObject: object | string,
	modularGQL: ModularGraphQL
) {
	if (typeof keyOrObject === "string") {
		return modularGQL.compiled(keyOrObject);
	} else {
		return keyOrObject;
	}
}
