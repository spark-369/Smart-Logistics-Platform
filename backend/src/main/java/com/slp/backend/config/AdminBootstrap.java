package com.slp.backend.config;

import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.util.AppConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the first administrator account.
 *
 * <p>Self-registration is intentionally restricted to CUSTOMER (see
 * {@code AuthServiceImpl#register}), which would otherwise leave a fresh deployment with no way to
 * create privileged users. This runner closes that gap.
 *
 * <p>Safety rules:
 * <ul>
 *   <li>Runs only when no ADMIN exists, so it never overwrites an existing deployment.</li>
 *   <li>Enabled with {@code app.bootstrap.admin.enabled} (default true in dev, should be disabled
 *       once a real admin exists / in production after first boot).</li>
 *   <li>Refuses to run in the {@code prod} profile with the default password.</li>
 * </ul>
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin.enabled:true}")
    private boolean enabled;

    @Value("${app.bootstrap.admin.email:admin@slp.com}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.password:admin123}")
    private String adminPassword;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Admin bootstrap disabled (app.bootstrap.admin.enabled=false)");
            return;
        }

        if (userRepository.countByRole(Role.ADMIN) > 0) {
            log.debug("Admin account already present; skipping bootstrap");
            return;
        }

        if ("prod".contains(activeProfile) && AppConstants.DEFAULT_ADMIN_PASSWORD.equals(adminPassword)) {
            log.warn("Refusing to create the default admin in the 'prod' profile with the default password. "
                    + "Set APP_BOOTSTRAP_ADMIN_PASSWORD or create an admin manually.");
            return;
        }

        User admin = User.builder()
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))
                .firstName(AppConstants.DEFAULT_ADMIN_FIRST_NAME)
                .lastName(AppConstants.DEFAULT_ADMIN_LAST_NAME)
                .phoneNumber(null)
                .role(Role.ADMIN)
                .enabled(true)
                .build();

        userRepository.save(admin);
        log.warn("Bootstrapped default administrator '{}'. Change this password immediately.", adminEmail);
    }
}
