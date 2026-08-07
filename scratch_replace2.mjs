import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readdirSync, statSync } from "fs";

function replaceLinks(dir, recursive = true) {
  const files = readdirSync(dir);
  for (const file of files) {
    if (file === "node_modules" || file === ".git" || file === "dist") continue;
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory() && recursive) {
      replaceLinks(fullPath, recursive);
    } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      
      let newContent = content.replace(/href="\/home"/g, 'href="/"');
      newContent = newContent.replace(/href="\/\?onboarding=true"/g, 'href="/app?onboarding=true"');
      newContent = newContent.replace(/href="\/\?auth=signin"/g, 'href="/app?auth=signin"');
      
      if (content !== newContent) {
        writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceLinks(join(process.cwd(), "public"), true);
replaceLinks(process.cwd(), false); // only root files like index.html
