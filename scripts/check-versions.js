#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Script to check version consistency across all project files
 */

const VERSION_FILES = [
	// Application files (primary)
	{
		name: "Desktop package.json",
		file: "apps/desktop/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "app",
	},
	{
		name: "Web package.json",
		file: "apps/web/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "app",
	},
	{
		name: "Tauri Cargo.toml",
		file: "apps/desktop/src-tauri/Cargo.toml",
		getter: (content) => {
			const match = content.match(/^version = "(.+)"$/m);
			return match ? match[1] : null;
		},
		category: "app",
	},
	{
		name: "Tauri config",
		file: "apps/desktop/src-tauri/tauri.conf.json",
		getter: (content) => JSON.parse(content).version,
		category: "app",
	},
	// Workspace files
	{
		name: "Workspace Cargo.toml",
		file: "Cargo.toml",
		getter: (content) => {
			const match = content.match(/^version = "(.+)"$/m);
			return match ? match[1] : null;
		},
		category: "workspace",
	},
	// Package files
	{
		name: "API package.json",
		file: "packages/api/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Auth package.json",
		file: "packages/auth/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "DB package.json",
		file: "packages/db/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Email package.json",
		file: "packages/email/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Notifications package.json",
		file: "packages/notifications/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Payment package.json",
		file: "packages/payment/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Rate Limit package.json",
		file: "packages/rate-limit/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "UI package.json",
		file: "packages/ui/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "Validators package.json",
		file: "packages/validators/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "package",
	},
	{
		name: "TypeScript tooling package.json",
		file: "tooling/typescript/package.json",
		getter: (content) => JSON.parse(content).version,
		category: "tooling",
	},
];

function checkVersions() {
	console.log("🔍 Checking version consistency...\n");

	const versions = [];
	let hasErrors = false;

	for (const versionFile of VERSION_FILES) {
		try {
			const filePath = path.join(process.cwd(), versionFile.file);
			const content = fs.readFileSync(filePath, "utf8");
			const version = versionFile.getter(content);

			versions.push({ ...versionFile, version });

			if (version) {
				console.log(`✅ ${versionFile.name}: ${version}`);
			} else {
				console.log(`❌ ${versionFile.name}: Version not found`);
				hasErrors = true;
			}
		} catch (error) {
			console.log(
				`❌ ${versionFile.name}: Error reading file - ${error.message}`,
			);
			hasErrors = true;
		}
	}

	// Check for consistency by category
	console.log("\n📊 Version Analysis:");

	const categories = ["app", "workspace", "package", "tooling"];
	const versionsByCategory = {};

	categories.forEach((category) => {
		versionsByCategory[category] = versions.filter(
			(v) => v.category === category,
		);
	});

	// Check app versions (must be consistent)
	const appVersions = [
		...new Set(versionsByCategory.app.map((v) => v.version).filter(Boolean)),
	];
	if (appVersions.length === 1) {
		console.log(`✅ App versions are consistent: ${appVersions[0]}`);
	} else {
		console.log("❌ App version mismatch detected:");
		appVersions.forEach((version) => {
			const files = versionsByCategory.app.filter((v) => v.version === version);
			console.log(`   ${version}: ${files.map((f) => f.name).join(", ")}`);
		});
		hasErrors = true;
	}

	// Check package versions (should match app versions)
	const packageVersions = [
		...new Set(
			versionsByCategory.package.map((v) => v.version).filter(Boolean),
		),
	];
	const mainVersion = appVersions[0];

	if (packageVersions.length === 1 && packageVersions[0] === mainVersion) {
		console.log(`✅ Package versions match app version: ${packageVersions[0]}`);
	} else {
		console.log("❌ Package versions out of sync:");
		packageVersions.forEach((version) => {
			const files = versionsByCategory.package.filter(
				(v) => v.version === version,
			);
			console.log(`   ${version}: ${files.map((f) => f.name).join(", ")}`);
		});
		hasErrors = true;
	}

	// Check workspace version (should match app versions)
	const workspaceVersions = [
		...new Set(
			versionsByCategory.workspace.map((v) => v.version).filter(Boolean),
		),
	];
	if (workspaceVersions.length === 1 && workspaceVersions[0] === mainVersion) {
		console.log(
			`✅ Workspace version matches app version: ${workspaceVersions[0]}`,
		);
	} else {
		console.log("❌ Workspace version out of sync:");
		workspaceVersions.forEach((version) => {
			const files = versionsByCategory.workspace.filter(
				(v) => v.version === version,
			);
			console.log(`   ${version}: ${files.map((f) => f.name).join(", ")}`);
		});
		hasErrors = true;
	}

	// Check tooling versions (should match app versions)
	const toolingVersions = [
		...new Set(
			versionsByCategory.tooling.map((v) => v.version).filter(Boolean),
		),
	];
	if (toolingVersions.length === 1 && toolingVersions[0] === mainVersion) {
		console.log(`✅ Tooling versions match app version: ${toolingVersions[0]}`);
	} else if (toolingVersions.length > 0) {
		console.log("❌ Tooling versions out of sync:");
		toolingVersions.forEach((version) => {
			const files = versionsByCategory.tooling.filter(
				(v) => v.version === version,
			);
			console.log(`   ${version}: ${files.map((f) => f.name).join(", ")}`);
		});
		hasErrors = true;
	}

	if (hasErrors) {
		console.log("\n💡 Run the version bump script to sync all versions.");
		process.exit(1);
	} else {
		console.log("\n🎉 All versions are in sync!");
	}
}

checkVersions();
