module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/../test/extension'],
	testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: {
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
		'^.+\\.tsx$': [
			'ts-jest',
			{
				tsconfig: {
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
					jsx: 'react-jsx',
				},
			},
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	moduleNameMapper: {
		'^vscode$': '<rootDir>/../test/extension/__mocks__/vscode.ts',
	},
	collectCoverageFrom: [
		'src/**/*.ts',
		'src/**/*.tsx',
		'!src/**/*.d.ts',
		'!src/**/*.test.ts',
		'!src/**/*.test.tsx',
		'!src/**/*.spec.ts',
		'!src/**/*.spec.tsx',
	],
};
