package com.slp.backend.repository;

import com.slp.backend.entity.User;
import com.slp.backend.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Page<User> findByRole(Role role, Pageable pageable);
    long countByRole(Role role);
}
