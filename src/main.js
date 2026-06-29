const core = require("@actions/core");
const os = require("node:os");
const path = require("node:path");
const zip = require("adm-zip");

const osmap = {
	darwin: "mac",
	linux: "linux",
};

const filenamePrefix = "commandline-tools-";
const filenameSuffix = ".zip";
const releaseUrl =
	"https://api.github.com/repos/harmonyos-dev/hos-sdk/releases/latest";
const sdkRoot = path.join(os.homedir(), "harmonyos-sdk");
const sdkHome = path.join(sdkRoot, "command-line-tools");
const sdkBin = path.join(sdkHome, "bin");

function getGitHubHeaders(token) {
	const headers = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "setup-harmonyos-sdk",
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return headers;
}

async function getLatestRelease(token) {
	const response = await fetch(releaseUrl, {
		headers: getGitHubHeaders(token),
	});
	const meta = await response.json().catch(() => ({}));

	if (!response.ok) {
		const message = meta.message ? `: ${meta.message}` : "";
		throw new Error(
			`Failed to fetch HarmonyOS SDK release metadata (${response.status} ${response.statusText})${message}`,
		);
	}

	if (!Array.isArray(meta.assets)) {
		throw new Error(
			"Failed to fetch HarmonyOS SDK release metadata: response did not include assets",
		);
	}

	return meta;
}

async function run() {
	core.info("Downloading HarmonyOS SDK...");

	const token = core.getInput("github-token");
	if (token) {
		core.setSecret(token);
	}

	let meta;
	try {
		meta = await getLatestRelease(token);
	} catch (error) {
		core.setFailed(error.message);
		return;
	}

	const assets = meta.assets;
	const mappedOS = osmap[os.platform()];
	const version = core.getInput("version");

	if (!mappedOS) {
		core.setFailed("Unsupported OS: " + os.platform());
		return;
	}

	const asset = assets.find(
		(asset) =>
			asset.name === `${filenamePrefix}${mappedOS}-${version}${filenameSuffix}`,
	);
	if (!asset) {
		core.setFailed(`No asset found for ${mappedOS}-${version}`);
		return;
	}

	const url = asset.browser_download_url;
	core.info(`Downloading SDK-${mappedOS}-${version} from ${url}...`);
	const response = await fetch(url);
	if (!response.ok) {
		core.setFailed(`Failed to download SDK: ${response.statusText}`);
		return;
	}

	const zipBuffer = await response.arrayBuffer();
	zip(Buffer.from(zipBuffer)).extractAllTo(sdkRoot, true, true);
	core.info("SDK downloaded and extracted to " + sdkRoot);

	core.setOutput("sdk-path", sdkHome);
	core.exportVariable("HOS_SDK_HOME", sdkHome);
	core.addPath(sdkBin);
}

module.exports = {
	run,
};
