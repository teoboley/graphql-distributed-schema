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
	config: () => IAssociationConfig
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
	return (childKey: string, config: () => IAssociationConfig) => {
		const parent = modularGQL.type(parentKey);
		const child = modularGQL.type(childKey);

		const getConfig = () => {
			const configuration = config();

			let relationship = Relationship.OneToOne;
			let parentConnection: any = null;
			let childConnection: any = null;

			if (configuration.parentConnection) {
				relationship = Relationship.ManyToMany;

				parentConnection = resolveCompiledFromTypeOrString(
					configuration.parentConnection,
					modularGQL
				);

				if (configuration.childConnection) {
					childConnection = resolveCompiledFromTypeOrString(
						configuration.childConnection,
						modularGQL
					);
				}
			} else if (configuration.childConnection) {
				relationship = Relationship.OneToMany;

				childConnection = resolveCompiledFromTypeOrString(
					configuration.childConnection,
					modularGQL
				);
			}

			return {
				...configuration,
				relationship,
				parentConnection,
				childConnection,
			}
		};

		parent.extend(() => {
			const configuration = getConfig();

			const elementField: GraphQLFieldConfig =
				configuration.relationship == Relationship.OneToOne
					? {
							// single
							type: modularGQL.compiled(childKey),
							args: configuration.childConnectionArgs,
							resolve: configuration.childResolveFromParent
						}
					: {
							// multiple
							type: configuration.childConnection,
							args: configuration.childConnectionArgs,
							resolve: configuration.childResolveFromParent
						};

			return {
				[configuration.name]: elementField
			};
		});

		child.extend(() => {
			const configuration = getConfig();

			const elementField: GraphQLFieldConfig =
				configuration.relationship == Relationship.OneToOne ||
				configuration.relationship == Relationship.OneToMany
					? {
							// single
							type: modularGQL.compiled(parentKey),
							args: configuration.parentConnectionArgs,
							resolve: configuration.parentResolveFromChild
						}
					: {
							// multiple
							type: configuration.parentConnection,
							args: configuration.parentConnectionArgs,
							resolve: configuration.parentResolveFromChild
						};

			return {
				[`${configuration.name}Of${capitalizeFirstLetter(
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
