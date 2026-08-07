import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readdirSync, statSync } from "fs";

function replaceHtmlLinks(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      replaceHtmlLinks(fullPath);
    } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      
      const newContent = content.replace(/href="([^"]+?)\.html"/g, 'href="$1"');
      
      if (content !== newContent) {
        writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceHtmlLinks(join(process.cwd(), "public"));
replaceHtmlLinks(join(process.cwd(), "content")); // In case articles have .html links
console.log("Done");
