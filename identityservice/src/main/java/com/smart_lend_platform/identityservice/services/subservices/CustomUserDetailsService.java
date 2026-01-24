package com.smart_lend_platform.identityservice.services.subservices;

import com.smart_lend_platform.identityservice.entities.User;
import com.smart_lend_platform.identityservice.repositories.UserRepository;
import com.smart_lend_platform.identityservice.securities.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        try {
            User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

            return new UserPrincipal(user);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }
}
