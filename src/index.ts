import {
	GraphQLFieldConfigMap,
	GraphQLFieldConfigMapThunk,
	GraphQLInterfacesThunk,
	GraphQLInterfaceType,
	GraphQLObjectType,
	GraphQLObjectTypeConfig,
	GraphQLResolveInfo
} from "graphql";

import { associator, IAssociationRawFunction } from "./associations";

export interface IDistributedRawType {
	name: string;
	interfaces?: GraphQLInterfacesThunk | GraphQLInterfaceType[];
	isTypeOf?: (value: any, info?: GraphQLResolveInfo) => boolean;
	description?: string;
	fieldsCollection: Array<(GraphQLFieldConfigMapThunk | GraphQLFieldConfigMap)>;
	extend: (
		fields: GraphQLFieldConfigMapThunk | GraphQLFieldConfigMap
	) => number;
	associateWith: IAssociationRawFunction;
}

export type IDistributedPlugin = (schema: ModularGraphQL) => any;
type IDistributedRawTypeExtension = (
	type: IDistributedRawType
) => IDistributedRawType;

export class ModularGraphQL {
	private rawTypes: { [key: string]: IDistributedRawType } = {};
	private compiledTypes: { [key: string]: GraphQLObjectType } = {};

	private used: IDistributedPlugin[] = [];

	public type(
		key: string,
		obj?: GraphQLObjectTypeConfig
	): IDistributedRawType {
		if (obj === undefined) {
			if (this.rawTypes[key] === undefined) {
				throw new Error(`Raw Type '${key}' does not exist.`);
			}

			return this.rawTypes[key];
		}

		return this.createRawType(key, obj);
	}

	public compiled(key: string): GraphQLObjectType {
		if (this.compiledTypes[key] === undefined) {
			throw new Error(`Compiled Type '${key}' does not exist.`);
		}

		return this.compiledTypes[key];
	}

	public generate() {
		for (const key in this.rawTypes) {
			if (this.rawTypes.hasOwnProperty(key)) {
				const item = this.rawTypes[key];
				this.compiledTypes[key] = this.compile(item);
			}
		}
	}

	private compile(rawType: IDistributedRawType) {
		return new GraphQLObjectType({
			name: rawType.name,
			interfaces: rawType.interfaces,
			isTypeOf: rawType.isTypeOf,
			description: rawType.description,
			fields: this.fnFromFnArray(rawType.fieldsCollection)
		});
	}

	/*
	public use(fn: IDistributedPlugin) {
		if (this.used.indexOf(fn) === -1) {
			fn(this);
			this.used.push(fn);
		}
	}

	public extendRawTypes(fn: IDistributedRawTypeExtension) {
		if (this.rawTypeExtensions.indexOf(fn) === -1) {
			this.rawTypeExtensions.push(fn);
		}
	}
	*/

	public flush() {
		this.flushRawTypes();
		this.flushCompiledTypes();
	}

	public flushRawTypes() {
		this.rawTypes = {};
	}

	public flushCompiledTypes() {
		this.compiledTypes = {};
	}

	private createRawType(
		key: string,
		obj: GraphQLObjectTypeConfig
	): IDistributedRawType {
		if (this.rawTypes[key]) {
			throw new Error(`Type '${key}' already exists.`);
		}

		return (this.rawTypes[key] = {
			name: obj.name,
			interfaces: obj.interfaces,
			isTypeOf: obj.isTypeOf,
			description: obj.description,
			fieldsCollection: [obj.fields],
			extend: fields =>
				this.rawTypes[key].fieldsCollection.push(
					fields instanceof Function ? fields : () => fields
				),
			associateWith: associator(key, this)
		});
	}

	private fnFromFnArray(functions): () => any {
		return () =>
			functions.reduce(
				(obj, fn) => Object.assign({}, obj, fn.call()),
				{}
			);
	}
}

export default new ModularGraphQL();
