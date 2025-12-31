<?php

class AutoWriter_Activator {

	public static function activate( $network_wide ) {
		global $wpdb;

		if ( function_exists( 'is_multisite' ) && is_multisite() && $network_wide ) {
			// Get all blogs in the network and activate plugin on each one
			$blog_ids = $wpdb->get_col( "SELECT blog_id FROM $wpdb->blogs" );
			foreach ( $blog_ids as $blog_id ) {
				switch_to_blog( $blog_id );
				self::create_tables();
				restore_current_blog();
			}
		} else {
			self::create_tables();
		}
	}

	private static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();
		$table_jobs = $wpdb->prefix . 'autowriter_jobs';
		$table_logs = $wpdb->prefix . 'autowriter_logs';

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		// Table: Jobs
		$sql_jobs = "CREATE TABLE $table_jobs (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			job_id varchar(255) NOT NULL,
			blog_id bigint(20) NOT NULL,
			status varchar(50) DEFAULT 'pending' NOT NULL,
			step varchar(50) DEFAULT '' NOT NULL,
			post_id bigint(20) DEFAULT 0,
			idempotency_key varchar(255),
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY status (status),
			UNIQUE KEY idempotency (idempotency_key)
		) $charset_collate;";

		dbDelta( $sql_jobs );

		// Table: Logs
		$sql_logs = "CREATE TABLE $table_logs (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			job_id varchar(255) NOT NULL,
			level varchar(20) NOT NULL,
			message text NOT NULL,
			payload_hash varchar(64) DEFAULT '',
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY job_id (job_id)
		) $charset_collate;";

		dbDelta( $sql_logs );
	}
}
