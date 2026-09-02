import re

with open("/root/.gemini/antigravity-cli/brain/77643337-4408-45dc-9b0e-ca4feee17908/.system_generated/steps/5612/content.md", "r") as f:
    text = f.read()

matches = re.findall(r'https://lh3\.googleusercontent\.com/pw/[A-Za-z0-9_-]+', text)
if not matches:
    matches = re.findall(r'https://lh3\.googleusercontent\.com/[A-Za-z0-9_-]+', text)

print("Matches found:", len(matches))
for m in list(set(matches))[:5]:
    print(m)
