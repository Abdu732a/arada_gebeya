fetch('https://jiji.com.et/electronics', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(r => r.text())
    .then(html => {
        const regex = /href="(\/electronics\/[^"?#]+)"/gi;
        const cats = new Set();
        let m;
        while ((m = regex.exec(html)) !== null) {
            const parts = m[1].split('/').filter(Boolean);
            if (parts.length === 2) cats.add(m[1]);
        }
        console.log([...cats].sort().join('\n'));
    });
