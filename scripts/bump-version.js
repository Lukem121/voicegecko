#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

/**
 * Script to automatically bump version across all project files
 * Usage: node scripts/bump-version.js 0.0.8
 */

const VERSION_FILES = [
	// Application files (primary)
	{
		name: "Desktop package.json",
		file: "apps/desktop/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "app",
	},
	{
		name: "Web package.json",
		file: "apps/web/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "app",
	},
	{
		name: "Tauri Cargo.toml",
		file: "apps/desktop/src-tauri/Cargo.toml",
		updater: (content, newVersion) => {
			return content.replace(/^version = ".+"$/m, `version = "${newVersion}"`);
		},
		category: "app",
	},
	{
		name: "Tauri config",
		file: "apps/desktop/src-tauri/tauri.conf.json",
		updater: (content, newVersion) => {
			const config = JSON.parse(content);
			config.version = newVersion;
			return JSON.stringify(config, null, 2) + "\n";
		},
		category: "app",
	},
	// Workspace files
	{
		name: "Workspace Cargo.toml",
		file: "Cargo.toml",
		updater: (content, newVersion) => {
			return content.replace(/^version = ".+"$/m, `version = "${newVersion}"`);
		},
		category: "workspace",
	},
	// Package files
	{
		name: "API package.json",
		file: "packages/api/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Auth package.json",
		file: "packages/auth/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "DB package.json",
		file: "packages/db/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Email package.json",
		file: "packages/email/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Notifications package.json",
		file: "packages/notifications/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Payment package.json",
		file: "packages/payment/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Rate Limit package.json",
		file: "packages/rate-limit/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "UI package.json",
		file: "packages/ui/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "Validators package.json",
		file: "packages/validators/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "package",
	},
	{
		name: "TypeScript tooling package.json",
		file: "tooling/typescript/package.json",
		updater: (content, newVersion) => {
			const pkg = JSON.parse(content);
			pkg.version = newVersion;
			return JSON.stringify(pkg, null, 2) + "\n";
		},
		category: "tooling",
	},
];

function isValidSemver(version) {
	const semverRegex =
		/^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
	return semverRegex.test(version);
}

function getCurrentVersion() {
	try {
		const pkgPath = path.join(process.cwd(), "apps/desktop/package.json");
		const content = fs.readFileSync(pkgPath, "utf8");
		return JSON.parse(content).version;
	} catch (error) {
		console.error("❌ Could not read current version:", error.message);
		process.exit(1);
	}
}

function suggestNextVersions(current) {
	const [major, minor, patch] = current.split(".").map(Number);
	return {
		patch: `${major}.${minor}.${patch + 1}`,
		minor: `${major}.${minor + 1}.0`,
		major: `${major + 1}.0.0`,
	};
}

function updateDocumentationFiles(newVersion) {
	const docUpdates = [
		{
			name: "RELEASE.md",
			file: "docs/RELEASE.md",
			updates: [
				{
					search: /^## Current Version: .+$/m,
					replace: `## Current Version: ${newVersion}`,
				},
				{
					search: /Currently at 0\.0\.\d+, needs sync/g,
					replace: `Currently synced at ${newVersion}`,
				},
				{
					search: /"0\.0\.\d+"/g,
					replace: `"${newVersion}"`,
				},
			],
		},
		{
			name: "DEVELOPMENT.md",
			file: "docs/DEVELOPMENT.md",
			updates: [
				{
					search: /Currently 0\.0\.\d+/g,
					replace: `Currently ${newVersion}`,
				},
			],
		},
	];

	const results = [];

	for (const docFile of docUpdates) {
		try {
			const filePath = path.join(process.cwd(), docFile.file);
			let content = fs.readFileSync(filePath, "utf8");

			for (const update of docFile.updates) {
				content = content.replace(update.search, update.replace);
			}

			fs.writeFileSync(filePath, content, "utf8");
			results.push({ name: docFile.name, success: true });
			console.log(`📄 Updated documentation: ${docFile.name}`);
		} catch (error) {
			results.push({
				name: docFile.name,
				success: false,
				error: error.message,
			});
			console.log(`❌ Failed to update ${docFile.name}: ${error.message}`);
		}
	}

	return results;
}

function bumpVersion(newVersion) {
	console.log(`🚀 Bumping version to: ${newVersion}\n`);

	const changes = [];
	const categories = ["app", "workspace", "package", "tooling"];

	// Update all versioned files by category
	for (const category of categories) {
		const categoryFiles = VERSION_FILES.filter((f) => f.category === category);
		console.log(`\n📂 Updating ${category} files:`);

		for (const versionFile of categoryFiles) {
			try {
				const filePath = path.join(process.cwd(), versionFile.file);
				const originalContent = fs.readFileSync(filePath, "utf8");
				const updatedContent = versionFile.updater(originalContent, newVersion);

				fs.writeFileSync(filePath, updatedContent, "utf8");
				changes.push({
					file: versionFile.file,
					name: versionFile.name,
					category: versionFile.category,
					success: true,
				});

				console.log(`   ✅ ${versionFile.name}`);
			} catch (error) {
				console.log(`   ❌ ${versionFile.name}: ${error.message}`);
				changes.push({
					file: versionFile.file,
					name: versionFile.name,
					category: versionFile.category,
					success: false,
					error: error.message,
				});
			}
		}
	}

	// Update documentation files
	console.log("\n📄 Updating documentation files:");
	const docResults = updateDocumentationFiles(newVersion);

	// Summary
	const successful = changes.filter((c) => c.success);
	const failed = changes.filter((c) => !c.success);
	const docSuccessful = docResults.filter((r) => r.success);
	const docFailed = docResults.filter((r) => !r.success);

	console.log("\n📊 Summary:");
	console.log(`✅ Successfully updated: ${successful.length} version files`);
	console.log(
		`📄 Successfully updated: ${docSuccessful.length} documentation files`,
	);

	if (failed.length > 0 || docFailed.length > 0) {
		console.log(`❌ Failed updates:`);
		failed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
		docFailed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
		process.exit(1);
	}

	console.log(`\n🎉 Version successfully bumped to ${newVersion}!`);
	console.log(
		`📦 Updated ${successful.length} files across ${categories.length} categories`,
	);
	console.log("\n📝 Next steps:");
	console.log("   1. Review changes: git diff");
	console.log("   2. Verify: pnpm version:check");
	console.log(
		`   3. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`,
	);
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function question(prompt) {
	return new Promise((resolve) => rl.question(prompt, resolve));
}

async function promptForVersion() {
	const currentVersion = getCurrentVersion();
	const suggestions = suggestNextVersions(currentVersion);

	console.log(`📦 Current version: ${currentVersion}\n`);
	console.log("💡 Version options:");
	console.log(`   1. Patch (${suggestions.patch}) - Bug fixes`);
	console.log(`   2. Minor (${suggestions.minor}) - New features`);
	console.log(`   3. Major (${suggestions.major}) - Breaking changes`);
	console.log("   4. Custom version");

	const choice = await question("\nSelect version type (1-4): ");

	let newVersion;
	switch (choice) {
		case "1":
			newVersion = suggestions.patch;
			break;
		case "2":
			newVersion = suggestions.minor;
			break;
		case "3":
			newVersion = suggestions.major;
			break;
		case "4":
			newVersion = await question("Enter custom version: ");
			break;
		default:
			console.log("❌ Invalid choice");
			rl.close();
			process.exit(1);
	}

	return newVersion;
}

async function main() {
	const args = process.argv.slice(2);
	let newVersion = args[0];

	// If no version provided, prompt for it
	if (!newVersion) {
		newVersion = await promptForVersion();
	}

	if (!isValidSemver(newVersion)) {
		console.error(`❌ Invalid semantic version: ${newVersion}`);
		console.error("   Expected format: X.Y.Z (e.g., 1.2.3)");
		rl.close();
		process.exit(1);
	}

	const currentVersion = getCurrentVersion();

	// Check which files need updating and show summary
	const filesToUpdate = [];
	VERSION_FILES.forEach((versionFile) => {
		try {
			const filePath = path.join(process.cwd(), versionFile.file);
			const content = fs.readFileSync(filePath, "utf8");
			let fileVersion;
			if (versionFile.file.includes("Cargo.toml")) {
				const match = content.match(/^version = "(.+)"$/m);
				fileVersion = match ? match[1] : null;
			} else {
				fileVersion = JSON.parse(content).version;
			}
			if (fileVersion !== newVersion) {
				filesToUpdate.push({
					name: versionFile.name,
					currentVersion: fileVersion,
					category: versionFile.category,
				});
			}
		} catch (error) {
			filesToUpdate.push({
				name: versionFile.name,
				currentVersion: "ERROR",
				category: versionFile.category,
			});
		}
	});

	if (filesToUpdate.length === 0) {
		console.log(`⚠️  All files already at version ${newVersion}.`);
		rl.close();
		process.exit(0);
	}

	// Show which files will be updated
	console.log(`\n🔍 Files needing update to ${newVersion}:`);
	const categories = ["app", "workspace", "package", "tooling"];
	categories.forEach((category) => {
		const categoryFiles = filesToUpdate.filter((f) => f.category === category);
		if (categoryFiles.length > 0) {
			console.log(`\n📂 ${category.toUpperCase()} files:`);
			categoryFiles.forEach((file) => {
				console.log(
					`   • ${file.name}: ${file.currentVersion} → ${newVersion}`,
				);
			});
		}
	});

	console.log(`\n📦 Current version: ${currentVersion}`);
	console.log(`🎯 Target version: ${newVersion}`);

	// Confirmation prompt
	const confirm = await question("\nProceed with version bump? (y/N): ");
	if (confirm.toLowerCase() !== "y") {
		console.log("❌ Version bump cancelled");
		rl.close();
		process.exit(0);
	}

	bumpVersion(newVersion);
	rl.close();
}

main().catch((error) => {
	console.error("❌ Version bump failed:", error);
	rl.close();
	process.exit(1);
});
