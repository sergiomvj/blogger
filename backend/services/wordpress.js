import axios from 'axios';
import crypto from 'crypto';

export async function publishToWP(jobId, jobData, artifacts, blogCredentials = null) {
    const wpUrl = blogCredentials?.api_url || process.env.WP_API_URL;
    const wpPassword = blogCredentials?.auth_credentials?.password || process.env.WP_APP_PASSWORD;
    const hmacSecret = process.env.HMAC_SECRET || 'dev-secret';

    if (!wpUrl || !wpPassword) {
        throw new Error('WP credentials not found for blog: ' + (jobData.blog_key || 'default'));
    }

    // Build the payload as expected by the class-autowriter-rest.php
    const payload = {
        job_id: jobId,
        idempotency_key: jobData.idempotency_key,
        blog_id: jobData.blog_id,
        post: {
            title: artifacts.outline?.title_candidates?.[0] || jobData.job_key,
            slug: artifacts.seo_title?.slug || '',
            content_html: artifacts.article_body?.content_html || '',
            excerpt: artifacts.article_body?.excerpt || '',
            categories: [jobData.category],
            tags: artifacts.tags?.tags || []
        },
        seo: {
            meta_description: artifacts.seo_meta?.meta_description || '',
            focus_keyword: artifacts.keyword_plan?.primary_keyword || ''
        }
    };

    const hmac = crypto.createHmac('sha256', hmacSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

    const auth = Buffer.from(`admin:${wpPassword}`).toString('base64');

    try {
        const response = await axios.post(`${wpUrl}/autowriter/v1/jobs`, payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'X-AutoWriter-Signature': hmac,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('WP Publish Error:', error.response?.data || error.message);
        throw error;
    }
}
