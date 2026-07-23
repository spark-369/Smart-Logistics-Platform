package com.slp.backend.service;

import com.slp.backend.dto.response.DashboardStatsResponse;

public interface DashboardService {
    DashboardStatsResponse getStats();
}
