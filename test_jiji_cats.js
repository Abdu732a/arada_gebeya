fetch('https://jiji.com.et', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(r => r.text())
    .then(html => {
        const regex = /href="(\/[^"?#]+)"/gi;
        const cats = new Set();
        let m;
        while ((m = regex.exec(html)) !== null) {
            const p = m[1];
            if (!p.includes('/') || p.split('/').length > 2) continue;
            cats.add(p);
        }
        console.log([...cats].sort().join('\n'));
    });
