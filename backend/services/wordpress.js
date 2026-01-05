import axios from 'axios';
import crypto from 'crypto';

export async function publishToWP(jobId, jobData, artifacts, blogCredentials = null) {
    const wpUrl = blogCredentials?.api_url || process.env.WP_API_URL;
    const wpPassword = blogCredentials?.auth_credentials?.password || process.env.WP_APP_PASSWORD;
    const hmacSecret = blogCredentials?.hmac_secret || process.env.HMAC_SECRET || 'dev-secret';

    if (!wpUrl || !wpPassword) {
        throw new Error('WP credentials not found for blog: ' + (jobData.blog_key || 'default'));
    }

    // Build FAQ HTML if present
    let finalContent = artifacts.article_body?.content_html || '';
    if (artifacts.faq?.faqs && artifacts.faq.faqs.length > 0) {
        let faqHtml = '\n\n<h2>Perguntas Frequentes (FAQ)</h2>\n<div class="autowriter-faq">';
        artifacts.faq.faqs.forEach(item => {
            faqHtml += `\n<div class="faq-item">\n<strong>${item.question}</strong>\n<p>${item.answer}</p>\n</div>`;
        });
        faqHtml += '\n</div>';
        finalContent += faqHtml;
    }

    const payload = {
        external_job_id: jobId,
        idempotency_key: jobData.idempotency_key,
        blog_id: jobData.blog_id,
        post: {
            title: artifacts.seo_title?.title || artifacts.outline?.title_candidates?.[0] || jobData.job_key,
            slug: artifacts.seo_title?.slug || '',
            content_html: finalContent,
            excerpt: artifacts.seo_meta?.meta_description || '', // Use meta as excerpt
            categories: [jobData.category],
            tags: artifacts.tags?.tags || []
        },
        images: {
            featured: artifacts.images?.featured || null,
            top: artifacts.images?.top || null
        },
        seo: {
            meta_description: artifacts.seo_meta?.meta_description || '',
            focus_keyword: artifacts.keyword_plan?.primary_keyword || '',
            meta_title: artifacts.seo_title?.title || ''
        }
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify(payload);

    const hmac = crypto.createHmac('sha256', hmacSecret)
        .update(timestamp.toString() + bodyString)
        .digest('hex');

    const wpUser = blogCredentials?.wp_user || 'admin';
    const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

    try {
        const response = await axios.post(`${wpUrl}/autowriter/v1/jobs`, payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'X-AW-Signature': hmac,
                'X-AW-Timestamp': timestamp.toString(),
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('WP Publish Error:', error.response?.data || error.message);
        throw error;
    }
}
