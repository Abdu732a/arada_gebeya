fetch('https://jiji.com.et', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(r => r.text())
    .then(html => {
        const regex = /href="(\/[^"]*tv[^"]*|\/[^"]*television[^"]*|\/[^"]*laptop[^"]*|\/[^"]*computer[^"]*)"/gi;
        const matches = new Set();
        let m;
        while ((m = regex.exec(html)) !== null) matches.add(m[1]);
        console.log([...matches]);
    });
