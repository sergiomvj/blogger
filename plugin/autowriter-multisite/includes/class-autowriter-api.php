<?php

class AutoWriter_API {

	public static function register_routes() {
		register_rest_route( 'autowriter/v1', '/jobs', array(
			'methods'             => 'POST',
			'callback'            => array( 'AutoWriter_API', 'receive_job' ),
			'permission_callback' => array( 'AutoWriter_API', 'check_permission' ),
		) );
	}

	public static function check_permission() {
		return current_user_can( 'manage_options' );
	}

	public static function receive_job( $request ) {
		global $wpdb;
		
		$params = $request->get_json_params();

		// Basic Validation
		if ( empty( $params['job_id'] ) || empty( $params['blog_id'] ) || empty( $params['post'] ) ) {
			return new WP_Error( 'missing_params', 'Missing required parameters', array( 'status' => 400 ) );
		}

		$job_id      = sanitize_text_field( $params['job_id'] );
		$target_blog = intval( $params['blog_id'] );
		$idem_key    = sanitize_text_field( $params['idempotency_key'] ?? '' );
		$post_data   = $params['post'];

		// Switch to target blog
		switch_to_blog( $target_blog );

		// Idempotency Check
		$table_jobs = $wpdb->prefix . 'autowriter_jobs';
		$existing = $wpdb->get_row( $wpdb->prepare( "SELECT id, post_id FROM $table_jobs WHERE idempotency_key = %s", $idem_key ) );

		if ( $existing ) {
			restore_current_blog();
			return new WP_REST_Response( array( 
				'message' => 'Job already processed', 
				'post_id' => $existing->post_id,
				'status'  => 'done' 
			), 200 );
		}

		// Create Post (Draft)
		$post_arr = array(
			'post_title'   => sanitize_text_field( $post_data['title'] ),
			'post_content' => wp_kses_post( $post_data['content_html'] ), // Sanitization
			'post_excerpt' => sanitize_textarea_field( $post_data['excerpt'] ),
			'post_status'  => 'draft',
			'post_author'  => get_current_user_id(),
			'post_name'    => sanitize_title( $post_data['slug'] ),
		);

		$post_id = wp_insert_post( $post_arr );

		if ( is_wp_error( $post_id ) ) {
			restore_current_blog();
			return $post_id;
		}

		// Record Job
		$wpdb->insert( 
			$table_jobs, 
			array( 
				'job_id'          => $job_id, 
				'blog_id'         => $target_blog, 
				'post_id'         => $post_id,
				'status'          => 'done', 
				'idempotency_key' => $idem_key 
			) 
		);

		restore_current_blog();

		return new WP_REST_Response( array( 
			'message' => 'Post created successfully', 
			'post_id' => $post_id, 
			'status'  => 'success' 
		), 201 );
	}
}
