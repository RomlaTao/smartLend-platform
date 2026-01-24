package com.smart_lend_platform.identityservice.services.subservices;

import com.smart_lend_platform.identityservice.repositories.UserProfileRepository;
import com.smart_lend_platform.identityservice.utils.SlugGenerateUtil;

import java.util.Random;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SlugGenerateService {
    private final UserProfileRepository userProfileRepository;

    public String generateSlug(String input) {

        Integer count = 1;
        try {

            String userSlug = SlugGenerateUtil.generateSlug(input);
            while (userProfileRepository.existsByUserSlug(userSlug) && count < 5) {
                userSlug = SlugGenerateUtil.generateSlug(input + "-" + new Random().nextInt(9999));
                count++;
            }

            if (count >= 5) {
                userSlug = SlugGenerateUtil.generateSlug("userDefault - " + new Random().nextInt(9999));
            }

            return userSlug;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate slug");
        }
    }
}
