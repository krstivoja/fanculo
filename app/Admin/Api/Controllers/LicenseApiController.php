<?php

namespace FanCoolo\Admin\Api\Controllers;

use FanCoolo\EDDUpdater\LicenseManager;

/**
 * License API Controller
 *
 * Handles license key retrieval and deletion operations
 */
class LicenseApiController extends BaseApiController
{
    public function registerRoutes()
    {
        register_rest_route('funculo/v1', '/license', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getLicense'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'deleteLicense'],
                'permission_callback' => [$this, 'checkDeletePermissions'],
            ],
        ]);
    }

    /**
     * Get license information
     *
     * @return \WP_REST_Response
     */
    public function getLicense()
    {
        $license_key = get_option('fancoolo_license_key', '');
        $license_status = get_option('fancoolo_license_status', '');

        $data = [
            'licenseKey' => $license_key,
            'licenseStatus' => $license_status,
            'isValid' => $license_status === 'valid',
        ];

        return $this->responseFormatter->success($data);
    }

    /**
     * Delete license (deactivate and remove)
     *
     * @return \WP_REST_Response|\WP_Error
     */
    public function deleteLicense()
    {
        try {
            // Delete license options
            delete_option('fancoolo_license_key');
            delete_option('fancoolo_license_status');

            return $this->responseFormatter->deleted('License deleted successfully');
        } catch (\Exception $e) {
            return $this->handleError($e, 'Delete License');
        }
    }
}
