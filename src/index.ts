import {
	GraphQLFieldConfigMap,
	GraphQLInterfaceType,
	GraphQLIsTypeOfFn,
	GraphQLObjectType,
	GraphQLObjectTypeConfig,
	Thunk
} from "graphql";

import { associator, IAssociationRawFunction } from "./associations";

export interface IDistributedRawType {
	name: string;
	interfaces?: Thunk<GraphQLInterfaceType[]> | GraphQLInterfaceType[];
	isTypeOf?: GraphQLIsTypeOfFn<any, any>;
	description?: string;
	fieldsCollection: Thunk<GraphQLFieldConfigMap<any, any>>[];
	extend: (
		fields:
			| Thunk<GraphQLFieldConfigMap<any, any>>
			| GraphQLFieldConfigMap<any, any>
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
		obj?: GraphQLObjectTypeConfig<any, any>
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
		obj: GraphQLObjectTypeConfig<any, any>
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
