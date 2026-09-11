import os
import re

base_dir = r"C:\Users\NIMITI-PC\Downloads\stitch_nirmitios_command_center\stitch_nirmitios_command_center"

screens = {
    "ai_activity_center": "src/app/activity/page.tsx",
    "cognitive_command": "src/app/cognitive/page.tsx",
    "command_execution_plan_my_week": "src/app/plan/page.tsx",
    "deep_knowledge_view": "src/app/knowledge/deep/page.tsx",
    "deep_memory_archive": "src/app/memory/archive/page.tsx",
    "learning_hub": "src/app/knowledge/learning/page.tsx",
    "life_domain_academic_research": "src/app/domains/academic/page.tsx",
    "memory_center": "src/app/memory/page.tsx",
    "mobile_command_terminal": "src/app/mobile/terminal/page.tsx",
    "mobile_dashboard": "src/app/mobile/dashboard/page.tsx",
    "mobile_goals": "src/app/mobile/goals/page.tsx",
    "mobile_knowledge_vault": "src/app/mobile/knowledge/page.tsx",
    "mobile_project_center": "src/app/mobile/projects/page.tsx",
    "mobile_tactical_horizon": "src/app/mobile/tactical/page.tsx",
    "monthly_strategic_review": "src/app/review/page.tsx",
    "settings_ai_configuration": "src/app/settings/page.tsx"
}

def html_to_jsx(html):
    # Extract only <main> content
    main_match = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)
    if main_match:
        jsx = main_match.group(1).strip()
    else:
        # Fallback to body
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
        if body_match:
            jsx = body_match.group(1).strip()
        else:
            return None
    
    # Remove scripts
    jsx = re.sub(r'<script.*?</script>', '', jsx, flags=re.DOTALL)
    
    # Fix class -> className
    jsx = jsx.replace('class="', 'className="')
    
    # Fix self-closing tags (only if they aren't already closed)
    for tag in ['img', 'input', 'br', 'hr', 'circle', 'polygon', 'path', 'line', 'rect']:
        jsx = re.sub(rf'<{tag}([^>]*?)(?<!/)>', rf'<{tag}\1 />', jsx)
        jsx = jsx.replace(f'</{tag}>', '')
    
    # SVG tags
    jsx = jsx.replace('stroke-width', 'strokeWidth')
    jsx = jsx.replace('stroke-dasharray', 'strokeDasharray')
    jsx = jsx.replace('stroke-dashoffset', 'strokeDashoffset')
    jsx = jsx.replace('stroke-linecap', 'strokeLinecap')
    jsx = jsx.replace('text-anchor', 'textAnchor')
    jsx = jsx.replace('viewbox', 'viewBox')
    jsx = jsx.replace('xmlns:xlink', 'xmlnsXlink')
    jsx = jsx.replace('fill-rule', 'fillRule')
    jsx = jsx.replace('clip-rule', 'clipRule')
    
    # Fix trailing closing tags created by self-closing regex
    jsx = jsx.replace('</circle>', '')
    jsx = jsx.replace('</polygon>', '')
    
    # Fix comments
    jsx = re.sub(r'<!--(.*?)-->', r'{/*\1*/}', jsx, flags=re.DOTALL)
    
    # Strip redundant layouts
    jsx = re.sub(r'<header[^>]*>.*?</header>', '', jsx, flags=re.DOTALL)
    jsx = re.sub(r'<nav[^>]*fixed bottom-0.*?</nav>', '', jsx, flags=re.DOTALL)
    jsx = re.sub(r'<aside[^>]*fixed left-0.*?</aside>', '', jsx, flags=re.DOTALL)
    
    def style_replacer(match):
        style_str = match.group(1)
        rules = style_str.split(';')
        jsx_rules = []
        for r in rules:
            if not r.strip(): continue
            parts = r.split(':')
            if len(parts) == 2:
                key = parts[0].strip()
                val = parts[1].strip()
                key = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), key)
                val = f'"{val}"'
                jsx_rules.append(f'{key}: {val}')
        return f'style={{{{ {", ".join(jsx_rules)} }}}}'
        
    jsx = re.sub(r'style="([^"]+)"', style_replacer, jsx)
    def escape_text(match):
        text = match.group(1)
        text = text.replace("'", "&apos;")
        text = text.replace('"', "&quot;")
        return f'>{text}<'
    jsx = re.sub(r'>([^<>]+)<', escape_text, jsx)
    
    return jsx

for screen_folder, output_path in screens.items():
    html_path = os.path.join(base_dir, screen_folder, "code.html")
    if not os.path.exists(html_path):
        print(f"Skipping {screen_folder}, not found.")
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        raw_html = f.read()
        
    jsx_content = html_to_jsx(raw_html)
    if not jsx_content:
        print(f"Failed to extract <main> from {screen_folder}")
        continue
        
    final_page = f"""export default function Page() {{
  return (
    <>
      {jsx_content}
    </>
  );
}}
"""
    
    full_out_path = os.path.join(r"d:\NirmitiOS", output_path)
    os.makedirs(os.path.dirname(full_out_path), exist_ok=True)
    with open(full_out_path, 'w', encoding='utf-8') as f:
        f.write(final_page)
    print(f"Created {output_path}")

