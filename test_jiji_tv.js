fetch('https://jiji.com.et/electronics', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
    .then(r => r.text())
    .then(html => {
        // Find all unique hrefs that contain tv, tablet, laptop, computer keywords
        const regex = /href="([^"]+)"/gi;
        const found = new Set();
        let m;
        while ((m = regex.exec(html)) !== null) {
            const href = m[1];
            if (/(tv|tablet|video|television)/i.test(href)) {
                found.add(href);
            }
        }
        console.log([...found].join('\n') || 'No matches found');
        console.log('\n--- First 3000 chars ---\n', html.slice(0, 3000));
    });
