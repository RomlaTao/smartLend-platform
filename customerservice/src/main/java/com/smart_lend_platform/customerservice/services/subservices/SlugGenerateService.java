package com.smart_lend_platform.customerservice.services.subservices;

import com.smart_lend_platform.customerservice.repositories.CustomerProfileRepository;
import com.smart_lend_platform.customerservice.utils.SlugGenerateUtil;

import java.util.Random;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SlugGenerateService {
    private final CustomerProfileRepository customerProfileRepository;
    private final SlugGenerateUtil slugGenerateUtil;

    public String generateSlug(String input) {

        Integer count = 1;
        try {

            String customerSlug = slugGenerateUtil.generateSlug(input);
            while (customerProfileRepository.existsByCustomerSlug(customerSlug) && count < 5) {
                customerSlug = slugGenerateUtil.generateSlug(input + "-" + new Random().nextInt(9999));
                count++;
            }

            if (count >= 5) {
                customerSlug = slugGenerateUtil.generateSlug("customerDefault - " + new Random().nextInt(9999));
            }   

            return customerSlug;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate slug");
        }
    }
}
