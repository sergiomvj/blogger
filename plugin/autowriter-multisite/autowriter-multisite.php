<?php
/**
 * Plugin Name: AutoWriter Multisite
 * Plugin URI:  https://example.com/autowriter
 * Description: Sistema de geração automática de artigos via API central. Network Activated.
 * Version:     1.0.0
 * Author:      AutoWriter Team
 * Text Domain: autowriter
 * Network:     true
 * License:     GPLv2 or later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AUTOWRITER_VERSION', '1.0.0' );
define( 'AUTOWRITER_PATH', plugin_dir_path( __FILE__ ) );
define( 'AUTOWRITER_URL', plugin_dir_url( __FILE__ ) );

/**
 * Main Plugin Class
 */
class AutoWriter_Plugin {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->includes();
		$this->hooks();
	}

	private function includes() {
		require_once AUTOWRITER_PATH . 'includes/class-autowriter-activator.php';
		require_once AUTOWRITER_PATH . 'includes/class-autowriter-api.php';
		// require_once AUTOWRITER_PATH . 'admin/class-autowriter-admin.php';
	}

	private function hooks() {
		register_activation_hook( __FILE__, array( 'AutoWriter_Activator', 'activate' ) );
		
		// Inicializa API REST
		add_action( 'rest_api_init', array( 'AutoWriter_API', 'register_routes' ) );
	}
}

// Initialize Plugin
function autowriter_init() {
	return AutoWriter_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'autowriter_init' );
