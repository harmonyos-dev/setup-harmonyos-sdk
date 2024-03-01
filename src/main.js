const core = require("@actions/core");
const os = require("node:os");
const zip = require("adm-zip");

osmap = {
	darwin: "mac",
	linux: "linux",
};

const filenamePrefix = "commandline-tools-";
const filenameSuffix = ".zip";

async function run() {
	core.info("Downloading HarmonyOS SDK...");

	const meta = await fetch(
		"https://api.github.com/repos/harmonyos-dev/hos-sdk/releases/latest",
	).then((res) => res.json());
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
	zip(Buffer.from(zipBuffer)).extractAllTo("/harmonyos-sdk", true, true);
	core.info("SDK downloaded and extracted to /harmonyos-sdk");

	core.setOutput("sdk-path", "/harmonyos-sdk");
	core.exportVariable("HOS_SDK_HOME", "/harmonyos-sdk/hwsdk");
	core.addPath("/harmonyos-sdk/hwsdk/bin");
}

module.exports = {
	run,
};
