type UserID = number;

export interface IMockDB {
	users: Array<{
		name: string;
	}>;
	posts: Array<{
		title: string;
		userId: UserID;
		likedBy: UserID[];
	}>;
	preferences: Array<{
		userId: UserID;
		displayName: string;
	}>;
}

const MockStore: IMockDB = {
	users: [
		{
			name: "John"
		},
		{
			name: "Harold"
		},
		{
			name: "Derek"
		}
	],
	posts: [
		{
			title: "Post 000",
			userId: 0,
			likedBy: [1, 2]
		},
		{
			title: "Post 001",
			userId: 0,
			likedBy: []
		},
		{
			title: "Post 002",
			userId: 1,
			likedBy: [0]
		},
		{
			title: "Post 003",
			userId: 2,
			likedBy: []
		}
	],
	preferences: [
		{
			userId: 0,
			displayName: "John Clancy"
		},
		{
			userId: 1,
			displayName: "Harold Wilkinson"
		},
		{
			userId: 2,
			displayName: "Derek Schumacher"
		}
	]
};

export default MockStore;
