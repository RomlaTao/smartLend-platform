package com.smart_lend_platform.customerservice.utils;

import com.smart_lend_platform.customerservice.repositories.CustomerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SlugGenerateUtil {
    private final CustomerProfileRepository customerProfileRepository;

    public String generateSlug(String title) {
        String slug = title.toLowerCase().replaceAll(" ", "-");
        slug = slug.replaceAll("[^a-z0-9-]", "");
        slug = slug.replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        int index = 1;
        while(customerProfileRepository.existsByCustomerSlug(slug)) {
            slug = slug + "-" + index;
            index++;
        }
        return slug;
    }
}
