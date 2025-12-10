// after-pack.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const appPath = context.appOutDir;
  console.log("=== AFTER PACK: Cleaning app bundle ===");

  const stubbornAttrs = [
    "com.apple.FinderInfo",
    "com.apple.fileprovider.fpfs#P",
    "com.apple.macl"
  ];

  // Recursively clear xattrs for a path
  function clearXattrsRecursively(targetPath) {
    try {
      execSync(`xattr -rc "${targetPath}"`);
      console.log(`✅ Cleared extended attributes recursively: ${targetPath}`);
    } catch (e) {
      console.warn(`⚠️ Failed to clear xattrs recursively for ${targetPath}:`, e.message);
    }
  }

  // Remove stubborn attributes individually
  function removeStubbornAttrs(targetPath) {
    stubbornAttrs.forEach(attr => {
      try {
        execSync(`xattr -d ${attr} "${targetPath}"`);
        console.log(`✅ Removed ${attr} from ${targetPath}`);
      } catch {}
    });
  }

  // Aggressive cleaning using ditto to strip resource forks
  function dittoClean(targetPath) {
    const tmpPath = targetPath + "-tmp";
    try {
      execSync(`ditto "${targetPath}" "${tmpPath}"`);
      execSync(`rm -rf "${targetPath}"`);
      execSync(`mv "${tmpPath}" "${targetPath}"`);
      console.log(`✅ Ditto cleaned: ${targetPath}`);
    } catch (e) {
      console.warn(`⚠️ Ditto failed for ${targetPath}:`, e.message);
    }
  }

  // Fully clean a directory (frameworks, helpers, etc.)
  function cleanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      if (fs.lstatSync(fullPath).isDirectory()) {
        clearXattrsRecursively(fullPath);
        removeStubbornAttrs(fullPath);
        dittoClean(fullPath);
        // Clean main executable inside helper apps
        const exePath = path.join(fullPath, "Contents", "MacOS", path.parse(item).name);
        if (fs.existsSync(exePath)) removeStubbornAttrs(exePath);
        // Recurse into frameworks inside helpers
        cleanDirectory(fullPath);
      } else {
        removeStubbornAttrs(fullPath);
      }
    }
  }

  // Step 1: Clean frameworks and helper apps
  const frameworksDir = path.join(appPath, "Contents", "Frameworks");
  cleanDirectory(frameworksDir);

  // Step 2: Clean top-level app bundle
  clearXattrsRecursively(appPath);
  removeStubbornAttrs(appPath);
  removeStubbornAttrs(path.join(appPath, "/CustoMLearning.app"));
  dittoClean(appPath);

  // Step 3: Verify no extended attributes remain
  console.log("Verifying no extended attributes remain...");
  try {
    const check = execSync(`xattr -lr "${appPath}"`).toString().trim();
    if (!check) {
      console.log("✅ All extended attributes removed successfully.");
    } else {
      console.warn("⚠️ Some extended attributes still remain:\n", check);
    }
  } catch (e) {
    console.log("✅ No extended attributes found (xattr returned error as expected).");
  }

  console.log("=== AFTER PACK CLEANUP COMPLETE ===");
};
